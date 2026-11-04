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

use crate::{state::Desktop, windows::Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use sha2::{Digest, Sha512};
use std::{
    path::PathBuf,
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
const MAX_MANIFEST: usize = 1024 * 1024;
const MAX_INSTALLER: u64 = 2 * 1024 * 1024 * 1024;
#[derive(Clone)]
struct Manifest {
    version: String,
    notes: String,
    url: reqwest::Url,
    sha512: [u8; 64],
    size: u64,
}
#[derive(Clone)]
struct Downloaded {
    manifest: Manifest,
    path: PathBuf,
}
struct Updater {
    operation: tokio::sync::Mutex<()>,
    downloaded: Mutex<Option<Downloaded>>,
    startup: Mutex<Option<u64>>,
}
static UPDATER: OnceLock<Updater> = OnceLock::new();
fn state() -> &'static Updater {
    UPDATER.get_or_init(|| Updater {
        operation: tokio::sync::Mutex::new(()),
        downloaded: Mutex::new(None),
        startup: Mutex::new(None),
    })
}
fn publish(app: &AppHandle, channel: &str, payload: Value) {
    let _ = app.emit("eisland-ipc", json!({"channel":channel,"args":[payload]}));
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "updater:check"
            | "updater:download"
            | "updater:install"
            | "updater:version"
            | "updater:startup-auto-check-ready"
            | "updater:startup-auto-check-received"
    )
}

pub fn start(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(5)).await;
        let enabled = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .value("update-auto-prompt-enabled", json!(true))
            != false;
        if enabled {
            let requested = super::media_state::now_ms();
            *state().startup.lock().unwrap() = Some(requested);
            publish(
                &app,
                "updater:startup-auto-check-request",
                json!({"requestedAt":requested}),
            );
        }
    });
}

pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    match channel {
        "updater:version" => Ok(json!(app.package_info().version.to_string())),
        "updater:startup-auto-check-ready" => Ok(state()
            .startup
            .lock()
            .unwrap()
            .map(|requested| json!({"requestedAt":requested}))
            .unwrap_or(Value::Null)),
        "updater:startup-auto-check-received" => {
            let mut pending = state().startup.lock().unwrap();
            if args.first().and_then(Value::as_u64) == *pending {
                *pending = None;
            }
            Ok(Value::Null)
        }
        "updater:check" => {
            let _guard = state().operation.lock().await;
            match check(app, args).await {
                Ok(manifest) => {
                    let current = app.package_info().version.to_string();
                    let available = newer(&manifest.version, &current)?;
                    publish(
                        app,
                        if available {
                            "updater:update-available"
                        } else {
                            "updater:update-not-available"
                        },
                        json!({"version":manifest.version,"releaseNotes":manifest.notes}),
                    );
                    Ok(
                        json!({"available":available,"version":manifest.version,"releaseNotes":manifest.notes,"currentVersion":current}),
                    )
                }
                Err(error) => Ok(json!({"available":false,"error":error})),
            }
        }
        "updater:download" => {
            let _guard = state().operation.lock().await;
            // A failed/new request invalidates any previously downloaded installer.
            *state().downloaded.lock().unwrap() = None;
            let result = async {
                let manifest = check(app, args).await?;
                if !newer(&manifest.version, &app.package_info().version.to_string())? {
                    return Err("NATIVE_UPDATE_NOT_NEWER".into());
                }
                let directory = app
                    .path()
                    .app_cache_dir()
                    .map_err(|e| e.to_string())?
                    .join("native-updates");
                tokio::fs::create_dir_all(&directory)
                    .await
                    .map_err(|e| e.to_string())?;
                let nonce = format!("{:032x}", rand::random::<u128>());
                let temporary = directory.join(format!("{nonce}.download"));
                let destination = directory.join(format!(
                    "eIsland_{}_{}-{nonce}-setup.exe",
                    manifest.version,
                    architecture()
                ));
                if let Err(error) = download(&manifest, &temporary, |progress| {
                    publish(app, "updater:download-progress", progress)
                })
                .await
                {
                    let _ = tokio::fs::remove_file(&temporary).await;
                    return Err(error);
                }
                tokio::fs::rename(&temporary, &destination)
                    .await
                    .map_err(|e| e.to_string())?;
                *state().downloaded.lock().unwrap() = Some(Downloaded {
                    manifest: manifest.clone(),
                    path: destination,
                });
                publish(
                    app,
                    "updater:update-downloaded",
                    json!({"version":manifest.version}),
                );
                Ok::<(), String>(())
            }
            .await;
            if let Err(error) = &result {
                publish(app, "updater:error", json!({"message":error}));
            }
            Ok(json!(result.is_ok()))
        }
        "updater:install" => {
            let _guard = state().operation.lock().await;
            let downloaded = state()
                .downloaded
                .lock()
                .unwrap()
                .clone()
                .ok_or("NATIVE_UPDATE_NOT_DOWNLOADED")?;
            verify(&downloaded.path, &downloaded.manifest).await?;
            if !newer(
                &downloaded.manifest.version,
                &app.package_info().version.to_string(),
            )? {
                return Err("NATIVE_UPDATE_NOT_NEWER".into());
            }
            #[cfg(windows)]
            {
                // The user explicitly requested installation; NSIS presents its native UI.
                std::process::Command::new(&downloaded.path)
                    .spawn()
                    .map_err(|e| format!("NATIVE_UPDATE_INSTALL_FAILED: {e}"))?;
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    app.exit(0);
                });
                Ok(json!(true))
            }
            #[cfg(not(windows))]
            {
                Err("NATIVE_UPDATE_PLATFORM_UNSUPPORTED".into())
            }
        }
        _ => Err("Unknown updater operation".into()),
    }
}
fn architecture() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        "x86" => "x86",
        other => other,
    }
}
fn platform() -> String {
    format!(
        "windows-{}",
        match std::env::consts::ARCH {
            "x86" => "i686",
            other => other,
        }
    )
}
fn secure_url(url: &reqwest::Url) -> Result<()> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err("NATIVE_UPDATE_URL_CREDENTIALS_NOT_ALLOWED".into());
    }
    if url.scheme() == "https" {
        return Ok(());
    }
    #[cfg(debug_assertions)]
    if url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1")) {
        return Ok(());
    }
    Err("NATIVE_UPDATE_REQUIRES_HTTPS".into())
}
fn endpoint(source: Option<&Value>, resolved: Option<&Value>) -> Result<reqwest::Url> {
    let source = match source.and_then(Value::as_str) {
        Some("github") => "github",
        Some("tencent-cos") => "tencent-cos",
        Some("aliyun-oss") => "aliyun-oss",
        Some("esa-cdn") => "esa-cdn",
        _ => "cloudflare-r2",
    };
    let raw = match source {
        "tencent-cos" | "aliyun-oss" => resolved
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .ok_or("PRO update source requires a server-issued URL")?
            .to_owned(),
        "github" => std::env::var("EISLAND_TAURI_UPDATE_GITHUB_URL").unwrap_or_else(|_| {
            "https://github.com/JNTMTMTM/eIsland/releases/latest/download/tauri-latest.json".into()
        }),
        "esa-cdn" => std::env::var("EISLAND_TAURI_UPDATE_ESA_URL").unwrap_or_else(|_| {
            "https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json"
                .into()
        }),
        _ => std::env::var("EISLAND_TAURI_UPDATE_R2_URL").unwrap_or_else(|_| {
            "https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev/tauri/latest.json".into()
        }),
    };
    let mut url = reqwest::Url::parse(&raw).map_err(|_| "NATIVE_UPDATE_URL_INVALID")?;
    if url.path().ends_with(".yml") || url.path().ends_with(".yaml") {
        return Err("ELECTRON_UPDATE_MANIFEST_REJECTED".into());
    }
    if !url.path().ends_with(".json") {
        url.set_path(&format!(
            "{}/tauri/latest.json",
            url.path().trim_end_matches('/')
        ));
    }
    secure_url(&url)?;
    Ok(url)
}
fn parse_manifest(value: &Value, base: &reqwest::Url) -> Result<Manifest> {
    // Native metadata is mandatory: historical Electron feeds are never accepted.
    if value["runtime"] != "tauri" {
        return Err("NATIVE_UPDATE_MANIFEST_REQUIRED: Electron manifests are not accepted".into());
    }
    let version = value["version"]
        .as_str()
        .filter(|version| !version.is_empty())
        .ok_or("NATIVE_UPDATE_VERSION_MISSING")?;
    version_parts(version)?;
    let artifact = &value["platforms"][platform()];
    if artifact.is_null() {
        return Err("NATIVE_UPDATE_PLATFORM_UNAVAILABLE".into());
    }
    if artifact["format"] != "nsis" {
        return Err("NATIVE_UPDATE_NSIS_REQUIRED".into());
    }
    let url = base
        .join(
            artifact["url"]
                .as_str()
                .ok_or("NATIVE_UPDATE_INSTALLER_MISSING")?,
        )
        .map_err(|_| "NATIVE_UPDATE_URL_INVALID")?;
    secure_url(&url)?;
    let name = url
        .path_segments()
        .and_then(|mut values| values.next_back())
        .unwrap_or("");
    // The retired eIsland-<version>-Setup.exe naming cannot be installed accidentally.
    let expected = format!("eIsland_{version}_{}-setup.exe", architecture());
    if name != expected {
        return Err("NATIVE_UPDATE_INSTALLER_NAME_INVALID".into());
    }
    let size = artifact["size"]
        .as_u64()
        .filter(|size| *size > 0 && *size <= MAX_INSTALLER)
        .ok_or("NATIVE_UPDATE_SIZE_INVALID")?;
    let hash = artifact["sha512"]
        .as_str()
        .ok_or("NATIVE_UPDATE_SHA512_REQUIRED")?;
    let sha512 = decode_hash(hash)?;
    let notes = value["notes"]
        .as_str()
        .or_else(|| value["releaseNotes"].as_str())
        .unwrap_or("")
        .to_owned();
    Ok(Manifest {
        version: version.to_owned(),
        notes,
        url,
        sha512,
        size,
    })
}
fn decode_hash(value: &str) -> Result<[u8; 64]> {
    let decoded = if value.len() == 128 && value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        (0..64)
            .map(|index| {
                u8::from_str_radix(&value[index * 2..index * 2 + 2], 16)
                    .map_err(|_| "NATIVE_UPDATE_SHA512_INVALID")
            })
            .collect::<std::result::Result<Vec<_>, _>>()?
    } else {
        STANDARD
            .decode(value)
            .map_err(|_| "NATIVE_UPDATE_SHA512_INVALID")?
    };
    decoded
        .try_into()
        .map_err(|_| "NATIVE_UPDATE_SHA512_INVALID".into())
}
fn version_parts(value: &str) -> Result<[u64; 3]> {
    if value.contains(['-', '+']) {
        return Err("NATIVE_UPDATE_PRERELEASE_DISABLED".into());
    }
    let values = value
        .trim_start_matches('v')
        .split('.')
        .map(|part| part.parse::<u64>())
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|_| "NATIVE_UPDATE_VERSION_INVALID")?;
    values
        .try_into()
        .map_err(|_| "NATIVE_UPDATE_VERSION_INVALID".into())
}
fn newer(latest: &str, current: &str) -> Result<bool> {
    Ok(version_parts(latest)? > version_parts(current)?)
}
async fn check(_app: &AppHandle, args: &[Value]) -> Result<Manifest> {
    let endpoint = endpoint(args.first(), args.get(1))?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let mut response = client
        .get(endpoint)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "NATIVE_UPDATE_MANIFEST_UNAVAILABLE")?;
    if !response.status().is_success() {
        return Err(format!(
            "NATIVE_UPDATE_MANIFEST_UNAVAILABLE: HTTP {}",
            response.status().as_u16()
        ));
    }
    secure_url(response.url())?;
    let base = response.url().clone();
    let bytes = super::music::network::bounded(&mut response, MAX_MANIFEST).await?;
    let value: Value = serde_json::from_slice(&bytes).map_err(|_| {
        "NATIVE_UPDATE_MANIFEST_REQUIRED: expected native Tauri JSON, not latest.yml"
    })?;
    parse_manifest(&value, &base)
}
async fn download(
    manifest: &Manifest,
    path: &std::path::Path,
    mut progress: impl FnMut(Value),
) -> Result<()> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(1800))
        .build()
        .map_err(|e| e.to_string())?;
    let mut response = client
        .get(manifest.url.clone())
        .send()
        .await
        .map_err(|_| "NATIVE_UPDATE_DOWNLOAD_FAILED")?;
    if !response.status().is_success() {
        return Err(format!(
            "NATIVE_UPDATE_DOWNLOAD_HTTP_{}",
            response.status().as_u16()
        ));
    }
    secure_url(response.url())?;
    if response
        .content_length()
        .is_some_and(|size| size != manifest.size)
    {
        return Err("NATIVE_UPDATE_SIZE_MISMATCH".into());
    }
    let mut file = tokio::fs::File::create(path)
        .await
        .map_err(|e| e.to_string())?;
    let mut hash = Sha512::new();
    let mut transferred = 0u64;
    let started = Instant::now();
    let mut last = Instant::now();
    let mut magic: Vec<u8> = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "NATIVE_UPDATE_DOWNLOAD_INTERRUPTED")?
    {
        if chunk.len() as u64 > manifest.size - transferred {
            return Err("NATIVE_UPDATE_SIZE_MISMATCH".into());
        }
        if magic.len() < 2 {
            magic.extend(chunk.iter().take(2 - magic.len()));
        }
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        hash.update(&chunk);
        transferred += chunk.len() as u64;
        if last.elapsed() >= Duration::from_millis(200) || transferred == manifest.size {
            last = Instant::now();
            progress(
                json!({"percent":transferred as f64/manifest.size as f64*100.,"transferred":transferred,"total":manifest.size,"bytesPerSecond":transferred as f64/started.elapsed().as_secs_f64().max(0.001)}),
            );
        }
    }
    file.sync_all().await.map_err(|e| e.to_string())?;
    if transferred != manifest.size {
        return Err("NATIVE_UPDATE_SIZE_MISMATCH".into());
    }
    if magic != b"MZ" {
        return Err("NATIVE_UPDATE_INVALID_EXECUTABLE".into());
    }
    if hash.finalize().as_slice() != manifest.sha512 {
        return Err("NATIVE_UPDATE_SHA512_MISMATCH".into());
    }
    Ok(())
}
async fn verify(path: &std::path::Path, manifest: &Manifest) -> Result<()> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|_| "NATIVE_UPDATE_INSTALLER_MISSING")?;
    if file.metadata().await.map_err(|e| e.to_string())?.len() != manifest.size {
        return Err("NATIVE_UPDATE_SIZE_MISMATCH".into());
    }
    let mut hash = Sha512::new();
    let mut buffer = vec![0; 65536];
    let mut first = true;
    loop {
        let size = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if size == 0 {
            break;
        }
        if first {
            if size < 2 || &buffer[..2] != b"MZ" {
                return Err("NATIVE_UPDATE_INVALID_EXECUTABLE".into());
            }
            first = false;
        }
        hash.update(&buffer[..size]);
    }
    if hash.finalize().as_slice() != manifest.sha512 {
        return Err("NATIVE_UPDATE_SHA512_MISMATCH".into());
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn updates_require_native_manifest_and_never_downgrade() {
        let base = reqwest::Url::parse("https://example.com/tauri/latest.json").unwrap();
        assert!(parse_manifest(
            &json!({"version":"99.0.0","files":[{"url":"eIsland-99.0.0-Setup.exe"}]}),
            &base
        )
        .is_err());
        assert!(endpoint(Some(&json!("tencent-cos")), None).is_err());
        assert!(endpoint(
            Some(&json!("tencent-cos")),
            Some(&json!("https://example.com/latest.yml"))
        )
        .is_err());
        assert!(!newer("27.0.0", "27.0.1").unwrap());
        assert!(newer("27.1.0", "27.0.1").unwrap());
        assert!(newer("27.1.0-beta", "27.0.1").is_err());
    }
    #[test]
    fn valid_native_nsis_manifest_requires_hash_size_platform_and_filename() {
        let base = reqwest::Url::parse("https://example.com/tauri/latest.json").unwrap();
        let mut value = json!({"runtime":"tauri","version":"28.0.0","platforms":{}});
        value["platforms"][platform()] = json!({"format":"nsis","url":format!("eIsland_28.0.0_{}-setup.exe",architecture()),"size":3,"sha512":STANDARD.encode([1u8;64])});
        let manifest = parse_manifest(&value, &base).unwrap();
        assert_eq!(manifest.sha512, [1; 64]);
        value["platforms"][platform()]["url"] = json!("eIsland-28.0.0-Setup.exe");
        assert!(parse_manifest(&value, &base).is_err());
        assert!(decode_hash("fake").is_err());
    }
    #[test]
    fn downloaded_installer_is_rehashed_before_installation() {
        tauri::async_runtime::block_on(async {
            let directory = std::env::temp_dir().join(format!(
                "eisland-native-updater-{:032x}",
                rand::random::<u128>()
            ));
            std::fs::create_dir_all(&directory).unwrap();
            let path = directory.join("fixture.exe");
            let bytes = b"MZ native updater test fixture";
            std::fs::write(&path, bytes).unwrap();
            let manifest = Manifest {
                version: "99.0.0".into(),
                notes: String::new(),
                url: reqwest::Url::parse("https://example.com/a.exe").unwrap(),
                sha512: Sha512::digest(bytes).into(),
                size: bytes.len() as u64,
            };
            verify(&path, &manifest).await.unwrap();
            let mut altered = bytes.to_vec();
            altered[3] ^= 1;
            std::fs::write(&path, altered).unwrap();
            assert!(verify(&path, &manifest).await.is_err());
            std::fs::remove_file(path).unwrap();
            std::fs::remove_dir(directory).unwrap();
        });
    }
    #[test]
    fn native_installer_download_streams_and_checks_manifest_digest() {
        let bytes = b"MZ updater fixture data";
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let url =
            reqwest::Url::parse(&format!("http://{}/fixture.exe", server.server_addr())).unwrap();
        let worker = std::thread::spawn(move || {
            for _ in 0..2 {
                let request = server.recv().unwrap();
                request
                    .respond(tiny_http::Response::from_data(bytes.to_vec()))
                    .unwrap();
            }
        });
        let directory = std::env::temp_dir().join(format!(
            "eisland-updater-download-{:032x}",
            rand::random::<u128>()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join("fixture.download");
        tauri::async_runtime::block_on(async {
            let mut manifest = Manifest {
                version: "99.0.0".into(),
                notes: String::new(),
                url,
                sha512: Sha512::digest(bytes).into(),
                size: bytes.len() as u64,
            };
            let mut updates = 0;
            download(&manifest, &path, |progress| {
                assert_eq!(progress["transferred"], bytes.len());
                updates += 1;
            })
            .await
            .unwrap();
            assert!(updates > 0);
            assert_eq!(std::fs::read(&path).unwrap(), bytes);
            manifest.sha512[0] ^= 1;
            assert!(download(&manifest, &path, |_| {}).await.is_err());
        });
        worker.join().unwrap();
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }
}
