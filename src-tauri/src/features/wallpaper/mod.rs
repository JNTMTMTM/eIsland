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

pub(crate) mod video;

use crate::shared::Result;
use crate::state::Desktop;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::{BufWriter, Cursor, Read, Write},
    path::{Component, Path, PathBuf},
    sync::OnceLock,
    time::Duration,
};
use tauri::{AppHandle, Manager};
const MAX_IMAGE: usize = 64 * 1024 * 1024;
const MAX_ORIGINAL: u64 = 128 * 1024 * 1024;
const ORIGINAL_KEY: &str = "desktop-wallpaper-original";
static SETTING: OnceLock<tokio::sync::Semaphore> = OnceLock::new();

/// Prepare all supported previews without ever asking the OS to fetch a URL or data URI.
/// The single setter permit also serializes backup/restore and cache publication.
pub async fn set(app: &AppHandle, payload: &Value) -> Result<Value> {
    if !cfg!(windows) {
        return Ok(json!(false));
    }
    let Ok(_permit) = SETTING
        .get_or_init(|| tokio::sync::Semaphore::new(1))
        .try_acquire()
    else {
        return Ok(json!(false));
    };
    let result = if payload["clear"] == true {
        let app = app.clone();
        tauri::async_runtime::spawn_blocking(move || restore(&app))
            .await
            .map_err(|e| e.to_string())?
    } else {
        let prepared = prepare(app, payload).await;
        match prepared {
            Ok(path) => {
                let app = app.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    let backup = backup(&app)?;
                    let result =
                        crate::features::system::set_wallpaper(&app, &json!({"sourcePath":path}))?;
                    if result == true {
                        let mut keep = vec![path];
                        for key in ["path", "cachedPath"] {
                            if let Some(path) = backup[key].as_str() {
                                keep.push(PathBuf::from(path));
                            }
                        }
                        cleanup(&cache(&app)?, &keep);
                    }
                    Ok(result)
                })
                .await
                .map_err(|e| e.to_string())?
            }
            Err(_) => Ok(json!(false)),
        }
    };
    // The established renderer contract is boolean; failed preparation never mutates the desktop.
    Ok(result.unwrap_or(json!(false)))
}
fn cache(app: &AppHandle) -> Result<PathBuf> {
    Ok(app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("desktop-wallpaper"))
}

pub(crate) async fn prepare(app: &AppHandle, payload: &Value) -> Result<PathBuf> {
    let source = payload["sourcePath"].as_str().unwrap_or("").trim();
    let preview = payload["previewUrl"].as_str().unwrap_or("").trim();
    let bytes = if !source.is_empty() && Path::new(source).is_file() {
        let source = PathBuf::from(source);
        tauri::async_runtime::spawn_blocking(move || read_local(&source, MAX_IMAGE))
            .await
            .map_err(|e| e.to_string())??
    } else if preview.starts_with("data:") {
        data_url(preview)?
    } else if preview.starts_with("file:") {
        let path = reqwest::Url::parse(preview)
            .map_err(|e| e.to_string())?
            .to_file_path()
            .map_err(|_| "Invalid wallpaper file URL")?;
        tauri::async_runtime::spawn_blocking(move || read_local(&path, MAX_IMAGE))
            .await
            .map_err(|e| e.to_string())??
    } else if let Some(key) = asset_key(preview)? {
        match app.asset_resolver().get(key.clone()) {
            Some(asset) if asset.bytes.len() <= MAX_IMAGE && !asset.bytes.is_empty() => asset.bytes,
            _ => {
                let dev = app
                    .config()
                    .build
                    .dev_url
                    .as_ref()
                    .ok_or("Embedded wallpaper asset missing")?
                    .join(&format!("/{key}"))
                    .map_err(|e| e.to_string())?;
                remote(&dev, MAX_IMAGE).await?
            }
        }
    } else if !preview.is_empty() && Path::new(preview).is_file() {
        let path = PathBuf::from(preview);
        tauri::async_runtime::spawn_blocking(move || read_local(&path, MAX_IMAGE))
            .await
            .map_err(|e| e.to_string())??
    } else if let Ok(url) = reqwest::Url::parse(preview) {
        if !matches!(url.scheme(), "http" | "https") {
            return Err("Unsupported wallpaper preview protocol".into());
        }
        remote(&url, MAX_IMAGE).await?
    } else {
        return Err("Wallpaper image source missing".into());
    };
    let directory = cache(app)?;
    tauri::async_runtime::spawn_blocking(move || publish_bmp(&bytes, &directory))
        .await
        .map_err(|e| e.to_string())?
}
fn read_local(path: &Path, limit: usize) -> Result<Vec<u8>> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let info = file.metadata().map_err(|e| e.to_string())?;
    if !info.is_file() || info.len() == 0 || info.len() > limit as u64 {
        return Err("Wallpaper image is empty or exceeds size limit".into());
    }
    let mut bytes = Vec::new();
    file.take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.is_empty() || bytes.len() > limit {
        return Err("Wallpaper image exceeds size limit".into());
    }
    Ok(bytes)
}
async fn remote(url: &reqwest::Url, limit: usize) -> Result<Vec<u8>> {
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Wallpaper downloads require HTTP(S)".into());
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let mut response = client
        .get(url.clone())
        .send()
        .await
        .map_err(|_| "Wallpaper download failed")?;
    if !response.status().is_success() {
        return Err(format!(
            "Wallpaper download HTTP {}",
            response.status().as_u16()
        ));
    }
    let bytes = crate::infrastructure::http::bounded(&mut response, limit).await?;
    if bytes.is_empty() {
        return Err("Wallpaper image is empty".into());
    }
    Ok(bytes)
}
fn data_url(value: &str) -> Result<Vec<u8>> {
    if value.len() > MAX_IMAGE * 4 / 3 + 128 {
        return Err("Wallpaper data URI exceeds size limit".into());
    }
    let (header, encoded) = value
        .split_once(";base64,")
        .ok_or("Wallpaper data URI must use base64")?;
    let mime = header
        .strip_prefix("data:image/")
        .ok_or("Wallpaper data URI must contain an image")?;
    if mime.is_empty()
        || !mime
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'+' | b'-'))
    {
        return Err("Invalid wallpaper MIME type".into());
    }
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|_| "Invalid wallpaper base64")?;
    if bytes.is_empty() || bytes.len() > MAX_IMAGE {
        return Err("Wallpaper image is empty or exceeds size limit".into());
    }
    Ok(bytes)
}
fn decode_path(value: &str) -> Result<String> {
    let bytes = value.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let a = bytes
                .get(index + 1)
                .ok_or("Invalid wallpaper asset encoding")?;
            let b = bytes
                .get(index + 2)
                .ok_or("Invalid wallpaper asset encoding")?;
            let pair = [*a, *b];
            let pair =
                std::str::from_utf8(&pair).map_err(|_| "Invalid wallpaper asset encoding")?;
            output.push(
                u8::from_str_radix(pair, 16).map_err(|_| "Invalid wallpaper asset encoding")?,
            );
            index += 3;
        } else {
            output.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(output).map_err(|_| "Invalid wallpaper asset encoding".into())
}
fn asset_key(value: &str) -> Result<Option<String>> {
    let raw = if let Ok(url) = reqwest::Url::parse(value) {
        if (matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost"))
            || (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        {
            url.path().to_owned()
        } else {
            return Ok(None);
        }
    } else if value.starts_with("/assets/")
        || value.starts_with("assets/")
        || value.starts_with("./assets/")
        || value.starts_with("../assets/")
    {
        value
            .trim_start_matches("../")
            .trim_start_matches("./")
            .split(['?', '#'])
            .next()
            .unwrap_or("")
            .to_owned()
    } else {
        return Ok(None);
    };
    let decoded = decode_path(&raw)?;
    let key = decoded.trim_start_matches('/');
    if !key.starts_with("assets/")
        || key.contains(['\\', '\0', ':'])
        || Path::new(key).components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::Prefix(_) | Component::RootDir
            )
        })
    {
        return Err("Wallpaper asset outside embedded assets".into());
    }
    Ok(Some(key.to_owned()))
}
fn publish_bmp(bytes: &[u8], directory: &Path) -> Result<PathBuf> {
    if bytes.is_empty() || bytes.len() > MAX_IMAGE {
        return Err("Wallpaper image exceeds size limit".into());
    }
    let mut reader = image::ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(16384);
    limits.max_image_height = Some(16384);
    limits.max_alloc = Some(MAX_ORIGINAL);
    reader.limits(limits);
    let image = reader
        .decode()
        .map_err(|_| "Wallpaper image cannot be decoded within limits")?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let name = format!("desktop-sync-{:x}.bmp", Sha256::digest(bytes));
    let target = directory.join(name);
    if target.is_file() {
        return Ok(target);
    }
    let temporary = directory.join(format!(
        ".desktop-sync-{:032x}.part",
        rand::random::<u128>()
    ));
    let result = (|| {
        let file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|e| e.to_string())?;
        let mut writer = BufWriter::new(file);
        image::DynamicImage::ImageRgb8(image.into_rgb8())
            .write_to(&mut writer, image::ImageFormat::Bmp)
            .map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        writer.get_ref().sync_all().map_err(|e| e.to_string())?;
        drop(writer);
        fs::rename(&temporary, &target).map_err(|e| e.to_string())?;
        Ok(target)
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}
fn backup(app: &AppHandle) -> Result<Value> {
    let existing = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value(ORIGINAL_KEY, Value::Null);
    if existing["path"].is_string() {
        return Ok(existing);
    }
    let path = current_wallpaper()?;
    let directory = cache(app)?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let mut value = json!({"path":path});
    if !path.is_empty() {
        let source = if Path::new(&path).is_file() {
            PathBuf::from(&path)
        } else {
            PathBuf::from(std::env::var_os("APPDATA").ok_or("Original wallpaper is unavailable")?)
                .join("Microsoft/Windows/Themes/TranscodedWallpaper")
        };
        let name = source
            .extension()
            .and_then(|name| name.to_str())
            .filter(|name| name.bytes().all(|byte| byte.is_ascii_alphanumeric()))
            .unwrap_or("jpg");
        let copy = directory.join(format!(
            "desktop-original-{:032x}.{name}",
            rand::random::<u128>()
        ));
        let file =
            File::open(source).map_err(|_| "Cannot back up the original desktop wallpaper")?;
        let info = file.metadata().map_err(|e| e.to_string())?;
        if !info.is_file() || info.len() == 0 || info.len() > MAX_ORIGINAL {
            return Err("Original desktop wallpaper exceeds backup limit".into());
        }
        let result = (|| {
            let mut output = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&copy)
                .map_err(|e| e.to_string())?;
            let length = std::io::copy(&mut file.take(MAX_ORIGINAL + 1), &mut output)
                .map_err(|e| e.to_string())?;
            if length > MAX_ORIGINAL {
                return Err("Original wallpaper exceeds backup limit".into());
            }
            output.sync_all().map_err(|e| e.to_string())?;
            Ok(())
        })();
        if let Err(error) = result {
            let _ = fs::remove_file(copy);
            return Err(error);
        }
        value["cachedPath"] = json!(copy);
    }
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write(ORIGINAL_KEY, &value)?;
    Ok(value)
}
fn restore(app: &AppHandle) -> Result<Value> {
    let backup = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value(ORIGINAL_KEY, Value::Null);
    let Some(path) = backup["path"].as_str() else {
        return Ok(json!(true));
    };
    let payload = if path.is_empty() {
        json!({"clear":true})
    } else if Path::new(path).is_file() {
        json!({"sourcePath":path})
    } else {
        let path = backup["cachedPath"]
            .as_str()
            .filter(|path| Path::new(path).is_file())
            .ok_or("Original desktop wallpaper backup missing")?;
        json!({"sourcePath":path})
    };
    let result = crate::features::system::set_wallpaper(app, &payload)?;
    if result == true {
        app.state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .write(ORIGINAL_KEY, &Value::Null)?;
    }
    Ok(result)
}
fn current_wallpaper() -> Result<String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            SystemParametersInfoW, SPI_GETDESKWALLPAPER,
        };
        let mut buffer = vec![0u16; 32768];
        let success = unsafe {
            SystemParametersInfoW(
                SPI_GETDESKWALLPAPER,
                buffer.len() as u32,
                buffer.as_mut_ptr().cast(),
                0,
            )
        };
        if success == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let end = buffer.iter().position(|c| *c == 0).unwrap_or(buffer.len());
        Ok(String::from_utf16_lossy(&buffer[..end]))
    }
    #[cfg(not(windows))]
    {
        Err("Desktop wallpaper control requires Windows".into())
    }
}
fn cleanup(directory: &Path, keep: &[PathBuf]) {
    if let Ok(files) = fs::read_dir(directory) {
        for file in files.flatten() {
            let path = file.path();
            let name = file.file_name();
            let name = name.to_string_lossy();
            if (name.starts_with("desktop-sync-") || name.starts_with("desktop-original-"))
                && !keep.contains(&path)
                && file.file_type().is_ok_and(|kind| kind.is_file())
            {
                let _ = fs::remove_file(path);
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Vec<u8> {
        let image = image::DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            2,
            2,
            image::Rgb([1, 2, 3]),
        ));
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        bytes.into_inner()
    }
    #[test]
    fn previews_resolve_data_and_embedded_asset_urls_without_path_escape() {
        let bytes = sample();
        assert_eq!(
            data_url(&format!(
                "data:image/png;base64,{}",
                STANDARD.encode(&bytes)
            ))
            .unwrap(),
            bytes
        );
        assert!(data_url("data:text/html;base64,SGVsbG8=").is_err());
        assert!(data_url("data:image/png;base64,bad!!").is_err());
        assert_eq!(
            asset_key("http://tauri.localhost/assets/wall%20paper.jpg").unwrap(),
            Some("assets/wall paper.jpg".into())
        );
        assert_eq!(
            asset_key("tauri://localhost/assets/test.jpg").unwrap(),
            Some("assets/test.jpg".into())
        );
        assert_eq!(
            asset_key("../assets/image.jpg").unwrap(),
            Some("assets/image.jpg".into())
        );
        assert!(asset_key("http://tauri.localhost/assets/%2f../outside.jpg").is_err());
        assert!(asset_key("https://example.com/image.jpg")
            .unwrap()
            .is_none());
    }
    #[test]
    fn image_preparation_produces_bmp_and_rejects_nonimages_without_os_changes() {
        let directory = std::env::temp_dir().join(format!(
            "eisland-wallpaper-test-{:032x}",
            rand::random::<u128>()
        ));
        let path = publish_bmp(&sample(), &directory).unwrap();
        let image = image::open(&path).unwrap();
        assert_eq!((image.width(), image.height()), (2, 2));
        assert!(fs::read(&path).unwrap().starts_with(b"BM"));
        assert!(publish_bmp(b"<html>not an image</html>", &directory).is_err());
        assert!(read_local(&path, 4).is_err());
        fs::remove_file(path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
    #[test]
    fn http_preparation_accepts_image_bytes_and_enforces_limits() {
        let bytes = sample();
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let url =
            reqwest::Url::parse(&format!("http://{}/wallpaper", server.server_addr())).unwrap();
        let fixture = bytes.clone();
        let worker = std::thread::spawn(move || {
            for _ in 0..2 {
                let request = server.recv().unwrap();
                let _ = request.respond(tiny_http::Response::from_data(fixture.clone()));
            }
        });
        tauri::async_runtime::block_on(async {
            assert_eq!(remote(&url, MAX_IMAGE).await.unwrap(), bytes);
            assert!(remote(&url, 4).await.is_err());
        });
        worker.join().unwrap();
    }
}
