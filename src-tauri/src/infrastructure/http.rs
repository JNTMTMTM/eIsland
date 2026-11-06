/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

//! Policy-separated pooled clients and bounded HTTP protocol handling.

use crate::shared::Result;
use std::{io::Read, sync::OnceLock, time::Duration};

// reqwest and the official updater share rustls. Install one provider before any
// pooled client is built, including local HTTP tests that still initialize TLS.
fn configure_tls() {
    static ONCE: std::sync::Once = std::sync::Once::new();
    ONCE.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

/// Ordinary HTTP requests share connections without cookies or default credentials.
pub(crate) fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        configure_tls();
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .expect("HTTP client initialization failed")
    })
}

/// Downloads keep byte offsets stable by disabling every automatic decompressor.
pub(crate) fn stream_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        configure_tls();
        reqwest::Client::builder()
            .gzip(false)
            .brotli(false)
            .deflate(false)
            .no_zstd()
            .connect_timeout(Duration::from_secs(10))
            .read_timeout(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .expect("Streaming HTTP client initialization failed")
    })
}

/// Music byte-range proxying has its own blocking pool with raw representation bytes.
pub(crate) fn blocking_stream_client() -> Result<reqwest::blocking::Client> {
    static CLIENT: OnceLock<Result<reqwest::blocking::Client>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            configure_tls();
            reqwest::blocking::Client::builder()
                .gzip(false)
                .brotli(false)
                .deflate(false)
                .no_zstd()
                .connect_timeout(Duration::from_secs(10))
                .timeout(Duration::from_secs(30))
                .redirect(reqwest::redirect::Policy::limited(10))
                .build()
                .map_err(|e| e.to_string())
        })
        .clone()
}

/// CLI hook payloads remain on the direct loopback connection and never follow redirects.
pub(crate) fn blocking_loopback_client() -> Result<reqwest::blocking::Client> {
    static CLIENT: OnceLock<Result<reqwest::blocking::Client>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            configure_tls();
            reqwest::blocking::Client::builder()
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .connect_timeout(Duration::from_secs(2))
                .timeout(Duration::from_secs(605))
                .build()
                .map_err(|error| error.to_string())
        })
        .clone()
}

pub(crate) async fn bounded(response: &mut reqwest::Response, limit: usize) -> Result<Vec<u8>> {
    if response
        .content_length()
        .is_some_and(|size| size > limit as u64)
    {
        return Err("response too large".into());
    }
    let mut output = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| {
        if e.is_timeout() {
            "timeout".into()
        } else {
            e.to_string()
        }
    })? {
        if chunk.len() > limit.saturating_sub(output.len()) {
            return Err("response too large".into());
        }
        output.extend_from_slice(&chunk);
    }
    Ok(output)
}

pub(crate) fn bounded_blocking(
    response: &mut reqwest::blocking::Response,
    limit: usize,
) -> Result<Vec<u8>> {
    if response
        .content_length()
        .is_some_and(|size| size > limit as u64)
    {
        return Err("response too large".into());
    }
    let mut bytes = Vec::new();
    response
        .take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("response too large".into());
    }
    Ok(bytes)
}

/// Parse a single RFC 9110 bytes range; multipart ranges remain deliberately unsupported.
/// The tuple is inclusive start/end plus HTTP status; an empty full response has end zero.
pub(crate) fn byte_range(header: Option<&str>, length: u64) -> Result<(u64, u64, u16)> {
    let Some(header) = header else {
        return Ok((0, length.saturating_sub(1), 200));
    };
    let (unit, range) = header.trim().split_once('=').ok_or("Invalid range")?;
    if !unit.eq_ignore_ascii_case("bytes") || range.contains(',') || length == 0 {
        return Err("Unsatisfiable range".into());
    }
    let (start, end) = range.split_once('-').ok_or("Invalid range")?;
    let number = |value: &str| -> Result<u64> {
        if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err("Invalid range".into());
        }
        value.parse().map_err(|_| "Invalid range".into())
    };
    let (start, end) = if start.is_empty() {
        let count = number(end)?;
        if count == 0 {
            return Err("Unsatisfiable range".into());
        }
        (length.saturating_sub(count), length - 1)
    } else {
        (
            number(start)?,
            if end.is_empty() {
                length - 1
            } else {
                number(end)?.min(length - 1)
            },
        )
    };
    if start > end || start >= length {
        return Err("Unsatisfiable range".into());
    }
    Ok((start, end, 206))
}

/// Reuse MIME's token/quoted-parameter grammar, then RFC 2231 decoding for filename*.
/// The extended HTTP filename takes precedence over the ASCII compatibility fallback.
pub(crate) fn disposition_filename(header: &str) -> Option<String> {
    let normalized = format!("application/{}", header.trim());
    let parsed = mediatype::MediaType::parse(&normalized).ok()?;
    let mut plain = None;
    let mut extended = None;
    for (name, value) in parsed.params.iter() {
        if name.as_str().eq_ignore_ascii_case("filename") {
            if plain.is_some() {
                return None;
            }
            plain = Some(value.unquoted_str().into_owned());
        } else if name.as_str().eq_ignore_ascii_case("filename*") {
            if extended.is_some() {
                return None;
            }
            let encoded = format!("attachment; filename*={}", value.as_str());
            extended = Some(
                mailparse::parse_content_disposition(&encoded)
                    .params
                    .remove("filename"),
            );
        }
    }
    extended.flatten().or(plain).filter(|name| !name.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ranges_cover_full_closed_open_suffix_empty_and_overflow_contracts() {
        for (raw, total, expected) in [
            (None, 0, (0, 0, 200)),
            (None, 8, (0, 7, 200)),
            (Some("bytes=2-4"), 8, (2, 4, 206)),
            (Some("bytes=2-99"), 8, (2, 7, 206)),
            (Some("bytes=5-"), 8, (5, 7, 206)),
            (Some("bytes=-3"), 8, (5, 7, 206)),
            (Some("BYTES=-99"), 8, (0, 7, 206)),
            (Some(" bytes=0-0 "), 8, (0, 0, 206)),
        ] {
            assert_eq!(byte_range(raw, total).unwrap(), expected);
        }
        for raw in [
            "bytes=",
            "bytes=-",
            "bytes=-0",
            "bytes=0-0,2-3",
            "bytes=+1-3",
            "bytes=8-",
            "bytes=4-2",
            "items=0-1",
            "bytes= 0-1",
            "bytes=0--1",
            "bytes=18446744073709551616-",
        ] {
            assert!(byte_range(Some(raw), 8).is_err(), "{raw}");
        }
        assert!(byte_range(Some("bytes=0-"), 0).is_err());
        assert_eq!(
            byte_range(Some("bytes=-18446744073709551615"), 8).unwrap(),
            (0, 7, 206)
        );
    }
    #[test]
    fn disposition_supports_rfc5987_priority_quoted_semicolons_escapes_and_invalid_data() {
        for (raw, name) in [
            ("attachment; filename=plain.zip", "plain.zip"),
            ("attachment; filename=\"file; name.zip\"", "file; name.zip"),
            ("attachment; filename=\"a\\\"b.zip\"", "a\"b.zip"),
            (
                "attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.zip",
                "中文.zip",
            ),
            (
                "attachment; filename=ascii.zip; filename*=UTF-8'en'%E4%B8%AD%E6%96%87.zip",
                "中文.zip",
            ),
            ("attachment; filename*=iso-8859-1''caf%E9.zip", "café.zip"),
            (
                "attachment; filename*=unknown''abc; filename=fallback.zip",
                "fallback.zip",
            ),
        ] {
            assert_eq!(disposition_filename(raw).as_deref(), Some(name), "{raw}");
        }
        for raw in [
            "attachment",
            "attachment; filename=",
            "attachment; filename=\"unterminated",
            "attachment; filename=a; filename=b",
            "attachment; filename*=unknown''abc",
            "attachment\r\nInjected: bad",
        ] {
            assert_eq!(disposition_filename(raw), None, "{raw}");
        }
    }
    #[test]
    fn pooled_clients_keep_policies_separate() {
        tauri::async_runtime::block_on(async {
            assert!(std::ptr::eq(client(), client()));
            assert!(std::ptr::eq(stream_client(), stream_client()));
            assert!(!std::ptr::eq(client(), stream_client()));
        });
    }
    #[test]
    fn bounded_async_checks_declared_and_streamed_lengths() {
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let base = format!("http://{}", server.server_addr());
        let worker = std::thread::spawn(move || {
            for _ in 0..3 {
                let request = server.recv().unwrap();
                let (body, declared) = match request.url() {
                    "/empty" => (Vec::new(), Some(0)),
                    "/stream" => (b"overflow".to_vec(), None),
                    _ => (b"hello".to_vec(), Some(5)),
                };
                request
                    .respond(tiny_http::Response::new(
                        tiny_http::StatusCode(200),
                        vec![],
                        std::io::Cursor::new(body),
                        declared,
                        None,
                    ))
                    .unwrap();
            }
        });
        tauri::async_runtime::block_on(async {
            let mut response = client().get(format!("{base}/full")).send().await.unwrap();
            assert_eq!(
                bounded(&mut response, 4).await.unwrap_err(),
                "response too large"
            );
            let mut response = client().get(format!("{base}/empty")).send().await.unwrap();
            assert_eq!(bounded(&mut response, 0).await.unwrap(), Vec::<u8>::new());
            let mut response = client().get(format!("{base}/stream")).send().await.unwrap();
            assert_eq!(
                bounded(&mut response, 4).await.unwrap_err(),
                "response too large"
            );
        });
        worker.join().unwrap();
    }
    #[test]
    fn bounded_blocking_retains_limits_and_success_bytes() {
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let base = format!("http://{}", server.server_addr());
        let worker = std::thread::spawn(move || {
            for _ in 0..2 {
                server
                    .recv()
                    .unwrap()
                    .respond(tiny_http::Response::from_string("hello"))
                    .unwrap();
            }
        });
        let client = blocking_stream_client().unwrap();
        assert_eq!(
            bounded_blocking(&mut client.get(&base).send().unwrap(), 5).unwrap(),
            b"hello"
        );
        assert_eq!(
            bounded_blocking(&mut client.get(&base).send().unwrap(), 4).unwrap_err(),
            "response too large"
        );
        worker.join().unwrap();
    }
    #[test]
    fn raw_stream_policies_do_not_decode_ranges_or_leak_request_credentials() {
        let compressed = vec![
            31, 139, 8, 0, 0, 0, 0, 0, 2, 255, 203, 72, 205, 201, 201, 7, 0, 134, 166, 16, 54, 5,
            0, 0, 0,
        ];
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let base = format!("http://{}", server.server_addr());
        let wire = compressed.clone();
        let worker = std::thread::spawn(move || {
            for index in 0..3 {
                let request = server.recv().unwrap();
                let authorized = request
                    .headers()
                    .iter()
                    .find(|header| header.field.equiv("Authorization"))
                    .map(|header| header.value.as_str());
                assert_eq!(
                    authorized,
                    if index == 0 {
                        Some("Bearer isolated-fixture")
                    } else {
                        None
                    }
                );
                request
                    .respond(
                        tiny_http::Response::from_data(wire.clone())
                            .with_header(
                                tiny_http::Header::from_bytes("Content-Encoding", "gzip").unwrap(),
                            )
                            .with_header(
                                tiny_http::Header::from_bytes(
                                    "Set-Cookie",
                                    "fixture-cookie=must-not-persist",
                                )
                                .unwrap(),
                            ),
                    )
                    .unwrap();
            }
        });
        tauri::async_runtime::block_on(async {
            let mut ordinary = client()
                .get(&base)
                .header("Authorization", "Bearer isolated-fixture")
                .send()
                .await
                .unwrap();
            assert_eq!(bounded(&mut ordinary, 5).await.unwrap(), b"hello");
            let mut raw = stream_client().get(&base).send().await.unwrap();
            assert_eq!(
                bounded(&mut raw, compressed.len()).await.unwrap(),
                compressed
            );
        });
        let mut raw = blocking_stream_client().unwrap().get(&base).send().unwrap();
        assert_eq!(
            bounded_blocking(&mut raw, compressed.len()).unwrap(),
            compressed
        );
        worker.join().unwrap();
    }
    #[test]
    fn loopback_hook_pool_never_follows_a_redirect_to_another_endpoint() {
        let redirect = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let destination = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let url = format!("http://{}/hook", redirect.server_addr());
        let target = format!("http://{}/must-not-receive", destination.server_addr());
        let worker = std::thread::spawn(move || {
            let request = redirect.recv().unwrap();
            request
                .respond(
                    tiny_http::Response::empty(302)
                        .with_header(tiny_http::Header::from_bytes("Location", target).unwrap()),
                )
                .unwrap();
        });
        let response = blocking_loopback_client()
            .unwrap()
            .post(url)
            .body("private-local-hook-fixture")
            .send()
            .unwrap();
        assert_eq!(response.status(), 302);
        assert!(destination.try_recv().unwrap().is_none());
        worker.join().unwrap();
    }
}
