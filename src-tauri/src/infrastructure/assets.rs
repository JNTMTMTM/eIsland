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

use crate::shared::Result;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::{Arc, OnceLock},
};
use tiny_http::{Header, Method, Response, Server, StatusCode};

struct Assets {
    base: String,
    key: [u8; 32],
}
static ASSETS: OnceLock<Result<Assets>> = OnceLock::new();

/// Signed paths keep already-issued URLs valid without a growing path registry.
pub fn url(path: &Path) -> Result<String> {
    let path = path.canonicalize().map_err(|e| e.to_string())?;
    if !path.is_file() {
        return Err("Expected regular file".into());
    }
    let assets = ASSETS.get_or_init(start).as_ref().map_err(Clone::clone)?;
    let encoded = URL_SAFE_NO_PAD.encode(path.to_string_lossy().as_bytes());
    let mut mac = Hmac::<Sha256>::new_from_slice(&assets.key).map_err(|e| e.to_string())?;
    mac.update(encoded.as_bytes());
    Ok(format!(
        "{}{encoded}.{}",
        assets.base,
        URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
    ))
}
fn start() -> Result<Assets> {
    let server = Arc::new(Server::http("127.0.0.1:0").map_err(|e| e.to_string())?);
    let base = format!("http://{}/", server.server_addr());
    let key = rand::random::<[u8; 32]>();
    // A bounded pool allows a slow video stream and independent seek/font/image requests.
    for index in 0..8 {
        let server = server.clone();
        std::thread::Builder::new()
            .name(format!("local-assets-{index}"))
            .spawn(move || {
                while let Ok(request) = server.recv() {
                    serve(request, &key);
                }
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(Assets { base, key })
}
fn serve(request: tiny_http::Request, key: &[u8; 32]) {
    if !matches!(request.method(), Method::Get | Method::Head) {
        let _ = request.respond(Response::empty(405));
        return;
    }
    let Ok(path) = authorized(request.url().trim_start_matches('/'), key) else {
        let _ = request.respond(Response::empty(404));
        return;
    };
    let Ok(mut file) = File::open(&path) else {
        let _ = request.respond(Response::empty(404));
        return;
    };
    let Ok(info) = file.metadata() else {
        let _ = request.respond(Response::empty(404));
        return;
    };
    if !info.is_file() {
        let _ = request.respond(Response::empty(404));
        return;
    }
    let total = info.len();
    let range = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Range"))
        .map(|h| h.value.as_str());
    let Ok((start, end, status)) = byte_range(range, total) else {
        let mut response = Response::empty(416);
        response
            .add_header(Header::from_bytes("Content-Range", format!("bytes */{total}")).unwrap());
        let _ = request.respond(response);
        return;
    };
    let length = if total == 0 { 0 } else { end - start + 1 };
    let _ = file.seek(SeekFrom::Start(start));
    let mut headers = vec![
        Header::from_bytes("Content-Type", mime(&path)).unwrap(),
        Header::from_bytes("Accept-Ranges", "bytes").unwrap(),
        Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
        Header::from_bytes(
            "Access-Control-Expose-Headers",
            "Content-Range,Content-Length,Accept-Ranges",
        )
        .unwrap(),
    ];
    if status == 206 {
        headers.push(
            Header::from_bytes("Content-Range", format!("bytes {start}-{end}/{total}")).unwrap(),
        );
    }
    let _ = request.respond(Response::new(
        StatusCode(status),
        headers,
        file.take(length),
        Some(length as usize),
        None,
    ));
}
fn authorized(token: &str, key: &[u8; 32]) -> Result<PathBuf> {
    let (encoded, signature) = token.split_once('.').ok_or("Invalid asset token")?;
    let signature = URL_SAFE_NO_PAD
        .decode(signature)
        .map_err(|e| e.to_string())?;
    let mut mac = Hmac::<Sha256>::new_from_slice(key).map_err(|e| e.to_string())?;
    mac.update(encoded.as_bytes());
    mac.verify_slice(&signature)
        .map_err(|_| "Invalid asset signature")?;
    let bytes = URL_SAFE_NO_PAD.decode(encoded).map_err(|e| e.to_string())?;
    let path = String::from_utf8(bytes).map_err(|e| e.to_string())?;
    Ok(PathBuf::from(path))
}
pub fn mime(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mp3" => "audio/mpeg",
        "m4a" => "audio/mp4",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}
fn byte_range(header: Option<&str>, length: u64) -> Result<(u64, u64, u16)> {
    let Some(header) = header else {
        return Ok((0, length.saturating_sub(1), 200));
    };
    let (start, end) = header
        .strip_prefix("bytes=")
        .and_then(|v| v.split_once('-'))
        .ok_or("Invalid range")?;
    let (start, end) = if start.is_empty() {
        let count = end.parse::<u64>().map_err(|_| "Invalid suffix")?;
        (length.saturating_sub(count), length.saturating_sub(1))
    } else {
        (
            start.parse::<u64>().map_err(|_| "Invalid range")?,
            if end.is_empty() {
                length.saturating_sub(1)
            } else {
                end.parse::<u64>()
                    .map_err(|_| "Invalid range")?
                    .min(length.saturating_sub(1))
            },
        )
    };
    if length == 0 || start > end || start >= length {
        return Err("Unsatisfiable range".into());
    }
    Ok((start, end, 206))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ranges_validate_and_clamp() {
        assert_eq!(byte_range(Some("bytes=2-4"), 8).unwrap(), (2, 4, 206));
        assert_eq!(byte_range(Some("bytes=-3"), 8).unwrap(), (5, 7, 206));
        assert!(byte_range(Some("bytes=9-"), 8).is_err());
        assert!(byte_range(Some("bytes=0-1,3-4"), 8).is_err());
    }
    #[test]
    fn asset_path_is_authenticated_and_stable() {
        let root =
            std::env::temp_dir().join(format!("eisland-asset-test-{}", uuid::Uuid::new_v4()));
        std::fs::write(&root, "fixture").unwrap();
        let first = url(&root).unwrap();
        assert_eq!(first, url(&root).unwrap());
        let assets = ASSETS.get().unwrap().as_ref().unwrap();
        assert_eq!(
            authorized(first.strip_prefix(&assets.base).unwrap(), &assets.key).unwrap(),
            root.canonicalize().unwrap()
        );
        assert!(authorized("L2V0Yy9wYXNzd2Q.invalid", &assets.key).is_err());
        std::fs::remove_file(root).unwrap();
    }
}
