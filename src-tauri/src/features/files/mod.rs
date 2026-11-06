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
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "app:pick-files"
            | "app:pick-local-search-directory"
            | "app:pick-skill-file"
            | "app:pick-feedback-screenshot-file"
            | "app:pick-feedback-log-file"
            | "app:pick-file-for-hash"
            | "app:read-text-file"
            | "app:save-text-file"
            | "app:search-local-files"
            | "app:clear-logs-cache"
            | "app:get-file-icon"
            | "app:open-file"
            | "app:open-in-explorer"
            | "app:save-image-as"
            | "app:resolve-shortcut"
            | "app:compute-file-hash"
            | "dialog:open-image"
            | "dialog:open-video"
            | "dialog:open-font"
            | "font:read-file"
            | "wallpaper:load-file"
            | "album:load-thumbnail"
            | "album:media-info"
            | "wallpaper:clear-cache"
            | "wallpaper:read-file-buffer"
            | "wallpaper:system:set"
            | "format-factory:pick-video"
            | "format-factory:extract-track"
            | "wallpaper:video:probe"
            | "wallpaper:video:prepare"
            | "wallpaper:video:cover"
            | "wallpaper:video:clear-cache"
            | "image-compression:pick-images"
            | "image-compression:pick-output-dir"
            | "log:write"
    )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    static DECODE_SLOTS: std::sync::OnceLock<std::sync::Arc<tokio::sync::Semaphore>> =
        std::sync::OnceLock::new();
    let _decode_slot = if channel == "album:load-thumbnail"
        || (channel == "wallpaper:load-file" && args.get(1).and_then(Value::as_bool) == Some(true))
    {
        Some(
            DECODE_SLOTS
                .get_or_init(|| std::sync::Arc::new(tokio::sync::Semaphore::new(2)))
                .clone()
                .acquire_owned()
                .await
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };
    let a = args.first().cloned().unwrap_or(Value::Null);
    let b = args.get(1).cloned().unwrap_or(Value::Null);
    match channel {
        "app:pick-files" | "image-compression:pick-images" => {
            let files = rfd::AsyncFileDialog::new().pick_files().await;
            return Ok(json!(files
                .unwrap_or_default()
                .iter()
                .map(|f| f.path().to_string_lossy().into_owned())
                .collect::<Vec<_>>()));
        }
        "app:pick-local-search-directory" | "image-compression:pick-output-dir" => {
            return Ok(json!(rfd::AsyncFileDialog::new()
                .pick_folder()
                .await
                .map(|f| f.path().to_string_lossy().into_owned())))
        }
        "app:pick-skill-file"
        | "app:pick-feedback-screenshot-file"
        | "app:pick-feedback-log-file"
        | "app:pick-file-for-hash"
        | "dialog:open-image"
        | "dialog:open-video"
        | "dialog:open-font"
        | "format-factory:pick-video" => {
            let dialog = rfd::AsyncFileDialog::new();
            let dialog = match channel {
                "app:pick-skill-file" => dialog.add_filter("Markdown", &["md"]),
                "dialog:open-font" => {
                    dialog.add_filter("TTF/OTF/WOFF/WOFF2", &["ttf", "otf", "woff", "woff2"])
                }
                "dialog:open-video" | "format-factory:pick-video" => dialog.add_filter(
                    "MP4/MKV/AVI/MOV/WebM/WMV/TS",
                    &["mp4", "mkv", "avi", "mov", "webm", "wmv", "ts"],
                ),
                "dialog:open-image" | "app:pick-feedback-screenshot-file" => dialog.add_filter(
                    "PNG/JPG/JPEG/GIF/BMP/WebP/SVG",
                    &["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"],
                ),
                _ => dialog,
            };
            let Some(file) = dialog.pick_file().await else {
                return Ok(Value::Null);
            };
            let path = file.path();
            if matches!(channel, "dialog:open-image" | "dialog:open-video") {
                let app = app.clone();
                let path = path.to_path_buf();
                let image = channel == "dialog:open-image";
                return Ok(tauri::async_runtime::spawn_blocking(move || {
                    import_background(&app, &path, image)
                })
                .await
                .map_err(|e| e.to_string())?
                .unwrap_or(Value::Null));
            }
            if channel == "dialog:open-font" {
                return font(path);
            }
            if channel == "format-factory:pick-video" {
                return Ok(
                    json!({"filePath":path,"fileName":path.file_name().unwrap_or_default().to_string_lossy(),"fileSize":fs::metadata(path).ok().map(|m|m.len())}),
                );
            }
            return Ok(json!(path));
        }
        "app:save-text-file" | "app:save-image-as" => {
            let default = if channel == "app:save-image-as" {
                Path::new(text(&a)?)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned()
            } else {
                a["defaultPath"]
                    .as_str()
                    .unwrap_or("eIsland-export.txt")
                    .to_owned()
            };
            let default_path = Path::new(&default);
            let mut dialog = rfd::AsyncFileDialog::new().set_file_name(
                default_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy(),
            );
            if let Some(parent) = default_path.parent().filter(|p| !p.as_os_str().is_empty()) {
                dialog = dialog.set_directory(parent);
            }
            if let Some(filters) = a["filters"].as_array() {
                for filter in filters {
                    let Some(name) = filter["name"].as_str().filter(|s| !s.is_empty()) else {
                        continue;
                    };
                    let extensions = filter["extensions"]
                        .as_array()
                        .map(|rows| {
                            rows.iter()
                                .filter_map(Value::as_str)
                                .filter(|s| !s.trim().is_empty())
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();
                    if !extensions.is_empty() {
                        dialog = dialog.add_filter(name, &extensions);
                    }
                }
            }
            let Some(file) = dialog.save_file().await else {
                return Ok(json!({"ok":false,"canceled":true,"filePath":null}));
            };
            let result = if channel == "app:save-image-as" {
                fs::copy(text(&a)?, file.path()).map(|_| ())
            } else {
                fs::write(file.path(), a["content"].as_str().unwrap_or(""))
            };
            if result.is_ok() {
                let _ = app.opener().reveal_item_in_dir(file.path());
            }
            return Ok(
                json!({"ok":result.is_ok(),"canceled":false,"filePath":if result.is_ok(){Some(file.path())}else{None}}),
            );
        }
        "format-factory:extract-track" => {
            return crate::features::wallpaper::video::extract(app, &a).await
        }
        "wallpaper:system:set" => return crate::features::wallpaper::set(app, &a).await,
        "wallpaper:video:probe"
        | "wallpaper:video:prepare"
        | "wallpaper:video:cover"
        | "wallpaper:video:clear-cache" => {
            return crate::features::wallpaper::video::handle(app, channel, &a).await
        }
        _ => {}
    }
    let nullable = matches!(
        channel,
        "app:read-text-file"
            | "app:compute-file-hash"
            | "app:get-file-icon"
            | "app:resolve-shortcut"
            | "font:read-file"
            | "wallpaper:load-file"
            | "album:load-thumbnail"
            | "album:media-info"
            | "wallpaper:read-file-buffer"
    );
    let app = app.clone();
    let channel = channel.to_owned();
    let args = args.to_vec();
    let outcome = tauri::async_runtime::spawn_blocking(move || work(&app, &channel, &a, &b, &args))
        .await
        .map_err(|e| e.to_string())?;
    if nullable {
        Ok(outcome.unwrap_or(Value::Null))
    } else {
        outcome
    }
}
fn text(value: &Value) -> Result<&str> {
    value
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or("Expected path".into())
}
use crate::infrastructure::storage::data_dir as data;
fn decode_image(path: &Path) -> Result<image::DynamicImage> {
    use image::ImageDecoder;
    let mut reader = image::ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(16000);
    limits.max_image_height = Some(16000);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let mut decoder = reader.into_decoder().map_err(|e| e.to_string())?;
    let orientation = decoder.orientation().map_err(|e| e.to_string())?;
    let mut image = image::DynamicImage::from_decoder(decoder).map_err(|e| e.to_string())?;
    image.apply_orientation(orientation);
    Ok(image)
}
fn import_background(app: &AppHandle, source: &Path, image: bool) -> Result<Value> {
    import_background_to(&data(app).join("wallpapers"), source, image).map(|path| json!(path))
}
fn import_background_to(directory: &Path, source: &Path, is_image: bool) -> Result<PathBuf> {
    static IMPORT: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = IMPORT.lock().unwrap();
    let source = source.canonicalize().map_err(|e| e.to_string())?;
    let info = fs::metadata(&source).map_err(|e| e.to_string())?;
    if !info.is_file() || (is_image && info.len() > 128 * 1024 * 1024) {
        return Err("Background file exceeds limits".into());
    }
    let ext = source
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    if is_image {
        if !["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"].contains(&ext.as_str()) {
            return Err("Unsupported background image".into());
        }
    } else if !["mp4", "mkv", "avi", "mov", "webm", "wmv", "ts"].contains(&ext.as_str()) {
        return Err("Unsupported background video".into());
    }
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let name = format!("custom-bg-{}.{}", uuid::Uuid::new_v4(), ext);
    let target = directory.join(&name);
    let temporary = directory.join(format!("{name}.part"));
    let outcome = fs::copy(source, &temporary).and_then(|_| fs::rename(&temporary, &target));
    if let Err(error) = outcome {
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }
    for item in fs::read_dir(directory)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        let name = item.file_name();
        if item.file_type().is_ok_and(|kind| kind.is_file())
            && name.to_string_lossy().starts_with("custom-bg-")
            && item.path() != target
        {
            let _ = fs::remove_file(item.path());
        }
    }
    Ok(target)
}
fn preview_background(app: &AppHandle, path: &Path) -> Result<PathBuf> {
    preview_background_to(&data(app).join("wallpapers"), path)
}
fn preview_background_to(directory: &Path, path: &Path) -> Result<PathBuf> {
    static PREVIEW: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = PREVIEW.lock().unwrap();
    let info = fs::metadata(path).map_err(|e| e.to_string())?;
    let stamp = format!(
        "{}:{:?}:{}",
        path.to_string_lossy(),
        info.modified().ok(),
        info.len()
    );
    let key = hex::encode(Sha256::digest(stamp.as_bytes()));
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let target = directory.join(format!("preview-{}.png", &key[..24]));
    if target.is_file() {
        return Ok(target);
    }
    let image = decode_image(path)?.thumbnail(2048, 2048);
    let temporary = target.with_extension("part");
    let result = image
        .save_with_format(&temporary, image::ImageFormat::Png)
        .and_then(|_| fs::rename(&temporary, &target).map_err(image::ImageError::IoError));
    if let Err(error) = result {
        let _ = fs::remove_file(temporary);
        return Err(error.to_string());
    }
    let mut old = fs::read_dir(directory)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|item| {
            item.file_type().is_ok_and(|kind| kind.is_file())
                && item.file_name().to_string_lossy().starts_with("preview-")
                && item.path() != target
        })
        .collect::<Vec<_>>();
    old.sort_by_key(|item| std::cmp::Reverse(item.metadata().and_then(|m| m.modified()).ok()));
    for item in old.into_iter().skip(15) {
        let _ = fs::remove_file(item.path());
    }
    Ok(target)
}
fn font(path: &Path) -> Result<Value> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["ttf", "otf", "woff", "woff2"].contains(&ext.as_str()) {
        return Ok(Value::Null);
    }
    let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if size > 20 * 1024 * 1024 {
        return Err("Font exceeds size limit".into());
    }
    Ok(
        json!({"path":path,"data":"","url":crate::infrastructure::assets::url(path)?,"ext":ext,"name":path.file_stem().unwrap_or_default().to_string_lossy()}),
    )
}
fn work(app: &AppHandle, channel: &str, a: &Value, b: &Value, args: &[Value]) -> Result<Value> {
    match channel {
        "app:read-text-file" => {
            let path = Path::new(text(a)?);
            if fs::metadata(path).map_err(|e| e.to_string())?.len() > 16 * 1024 * 1024 {
                return Err("Text file exceeds size limit".into());
            }
            Ok(json!(fs::read_to_string(path).ok()))
        }
        "app:open-file" => {
            app.opener()
                .open_path(text(a)?, None::<&str>)
                .map_err(|e| e.to_string())?;
            Ok(json!(true))
        }
        "app:open-in-explorer" => {
            app.opener()
                .reveal_item_in_dir(text(a)?)
                .map_err(|e| e.to_string())?;
            Ok(json!(true))
        }
        "app:search-local-files" => search(
            text(a)?,
            b.as_str().unwrap_or(""),
            args.get(2).unwrap_or(&Value::Null),
        ),
        "app:compute-file-hash" => hash(Path::new(text(a)?), b.as_str().unwrap_or("sha256")),
        "font:read-file" => font(Path::new(text(a)?)),
        "wallpaper:load-file" => {
            let path = Path::new(text(a)?);
            let extension = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if !["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"]
                .contains(&extension.as_str())
            {
                return Ok(Value::Null);
            }
            let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
            if size > 128 * 1024 * 1024 {
                return Err("Image exceeds size limit".into());
            }
            let preview = b == true && ["jpg", "jpeg", "png", "bmp"].contains(&extension.as_str());
            Ok(json!(crate::infrastructure::assets::url(&if preview {
                preview_background(app, path)?
            } else {
                path.to_path_buf()
            })?))
        }
        "album:load-thumbnail" => {
            let image = decode_image(Path::new(text(a)?))?.thumbnail(320, 320);
            let mut bytes = Vec::new();
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut bytes, 78)
                .encode_image(&image.to_rgb8())
                .map_err(|e| e.to_string())?;
            Ok(json!(format!(
                "data:image/jpeg;base64,{}",
                STANDARD.encode(bytes)
            )))
        }
        "album:media-info" => {
            let path = Path::new(text(a)?);
            let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
            Ok(json!({"url":crate::infrastructure::assets::url(path)?,"sizeBytes":metadata.len()}))
        }
        "wallpaper:read-file-buffer" => {
            let directory = data(app)
                .join("wallpapers")
                .canonicalize()
                .map_err(|e| e.to_string())?;
            let path = Path::new(text(a)?)
                .canonicalize()
                .map_err(|e| e.to_string())?;
            if !path.starts_with(directory)
                || fs::metadata(&path).map_err(|e| e.to_string())?.len() > 64 * 1024 * 1024
            {
                return Err("Wallpaper buffer outside permitted cache or too large".into());
            }
            Ok(json!(crate::infrastructure::assets::url(&path)?))
        }
        "wallpaper:clear-cache" => {
            clear_prefixed(&data(app).join("wallpapers"), &["custom-bg-", "preview-"])?;
            Ok(Value::Null)
        }
        "app:clear-logs-cache" => {
            let directory = app.path().app_log_dir().map_err(|e| e.to_string())?;
            let bytes = clear_prefixed(&directory, &[""])?;
            Ok(json!({"success":true,"freedBytes":bytes}))
        }
        "log:write" => {
            let directory = app.path().app_log_dir().map_err(|e| e.to_string())?;
            fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
            use std::io::Write;
            let mut file = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(directory.join("renderer.log"))
                .map_err(|e| e.to_string())?;
            writeln!(file, "{} {} {}", crate::shared::time::now_ms(), a, b)
                .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "app:get-file-icon" => crate::features::system::file_icon(Path::new(text(a)?)),
        "app:resolve-shortcut" => crate::features::system::shortcut(Path::new(text(a)?)),
        "wallpaper:system:set" => crate::features::system::set_wallpaper(app, a),
        _ => Err(format!("Unknown file operation: {channel}")),
    }
}
fn clear_prefixed(directory: &Path, prefixes: &[&str]) -> Result<u64> {
    let mut bytes = 0;
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(0);
    };
    for entry in entries.flatten() {
        if !prefixes
            .iter()
            .any(|p| entry.file_name().to_string_lossy().starts_with(p))
        {
            continue;
        }
        let info = entry.file_type().map_err(|e| e.to_string())?;
        if info.is_file() && !info.is_symlink() {
            let size = entry.metadata().map_err(|e| e.to_string())?.len();
            fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
            bytes += size;
        }
    }
    Ok(bytes)
}
fn hash(path: &Path, algorithm: &str) -> Result<Value> {
    use crate::infrastructure::hashing::{self, Algorithm};
    // The toolbox historically defaults unknown algorithm names to SHA-256.
    let algorithm = match algorithm {
        "md5" | "sha1" | "sha256" | "sha512" => Algorithm::parse(algorithm)?,
        _ => Algorithm::Sha256,
    };
    let hash = hashing::file(path, algorithm)?;
    Ok(
        json!({"hash":hash,"algorithm":algorithm.name(),"fileName":path.file_name().unwrap_or_default().to_string_lossy(),"fileSize":fs::metadata(path).map_err(|e|e.to_string())?.len()}),
    )
}
fn search(root: &str, keyword: &str, options: &Value) -> Result<Value> {
    let keyword = keyword.trim();
    if keyword.is_empty() || root.trim().is_empty() {
        return Ok(json!([]));
    }
    let limit = options
        .as_u64()
        .or_else(|| options["limit"].as_u64())
        .unwrap_or(120)
        .clamp(1, 500) as usize;
    let depth = options["maxDepth"].as_u64().unwrap_or(8).min(12) as usize;
    let case = options["caseSensitive"] == true;
    let keyword = if case {
        keyword.to_owned()
    } else {
        keyword.to_lowercase()
    };
    let include_hidden = options["includeHidden"] == true;
    let dirs = options["includeDirectories"] != false;
    let files = options["includeFiles"] != false;
    let excluded = options["excludeDirs"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let extensions = options["extensions"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let mut results = Vec::new();
    for item in walkdir::WalkDir::new(root)
        .max_depth(depth + 1)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }
            let name = entry.file_name().to_string_lossy();
            (!name.starts_with('.') || include_hidden)
                && (!entry.file_type().is_dir()
                    || (!["node_modules", ".git", ".idea", ".vscode"].contains(&name.as_ref())
                        && !excluded
                            .iter()
                            .any(|v| v.as_str().is_some_and(|s| s.eq_ignore_ascii_case(&name)))))
        })
    {
        let Ok(entry) = item else {
            continue;
        };
        if entry.depth() == 0 {
            continue;
        }
        let directory = entry.file_type().is_dir();
        if (directory && !dirs) || (!directory && !files) {
            continue;
        }
        let name = entry.file_name().to_string_lossy();
        let path = entry.path().to_string_lossy();
        let target = if options["matchScope"] == "path" {
            path.as_ref()
        } else {
            name.as_ref()
        };
        let target = if case {
            target.to_owned()
        } else {
            target.to_lowercase()
        };
        let matches = match options["matchMode"].as_str().unwrap_or("contains") {
            "startsWith" => target.starts_with(&keyword),
            "endsWith" => target.ends_with(&keyword),
            "exact" => target == keyword,
            _ => target.contains(&keyword),
        };
        if !matches
            || (!directory
                && !extensions.is_empty()
                && !extensions.iter().any(|e| {
                    e.as_str().is_some_and(|e| {
                        entry.path().extension().is_some_and(|ext| {
                            ext.to_string_lossy()
                                .eq_ignore_ascii_case(e.trim_start_matches('.'))
                        })
                    })
                }))
        {
            continue;
        }
        results.push(json!({"name":name,"path":path,"isDirectory":directory}));
        if results.len() >= limit {
            break;
        }
    }
    Ok(json!(results))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn search_respects_extensions_and_limits() {
        let root = std::env::temp_dir().join(format!(
            "eisland-files-test-{}",
            crate::shared::time::now_ms()
        ));
        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::write(root.join("sample.txt"), "hello").unwrap();
        fs::write(root.join("sample.png"), "image").unwrap();
        fs::write(root.join("node_modules/hidden.txt"), "hidden").unwrap();
        let results = search(
            root.to_str().unwrap(),
            "sample",
            &json!({"extensions":["txt"]}),
        )
        .unwrap();
        assert_eq!(results.as_array().unwrap().len(), 1);
        assert_eq!(
            search(
                root.join("node_modules").to_str().unwrap(),
                "hidden",
                &json!({})
            )
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
            1
        );
        assert_eq!(
            hash(&root.join("sample.txt"), "sha256").unwrap()["hash"],
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn background_import_survives_source_removal_and_preview_is_bounded() {
        let root =
            std::env::temp_dir().join(format!("eisland-background-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let source = root.join("photo.png");
        let directory = root.join("wallpapers");
        image::RgbImage::new(4096, 4).save(&source).unwrap();
        let imported = import_background_to(&directory, &source, true).unwrap();
        fs::remove_file(source).unwrap();
        assert!(imported.is_file());
        let preview = preview_background_to(&directory, &imported).unwrap();
        assert_eq!(image::image_dimensions(&preview).unwrap(), (2048, 2));
        assert_eq!(
            preview,
            preview_background_to(&directory, &imported).unwrap()
        );
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod icon_tests {
    use super::*;
    #[test]
    fn ico_images_decode_under_existing_thumbnail_limits() {
        let root = std::env::temp_dir().join(format!("eisland-ico-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("fixture.ico");
        let image = image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(
            16,
            16,
            image::Rgba([12, 34, 56, 255]),
        ));
        let mut bytes = std::io::Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Ico).unwrap();
        fs::write(&path, bytes.into_inner()).unwrap();
        let decoded = decode_image(&path).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (16, 16));
        assert_eq!(decoded.to_rgba8().get_pixel(0, 0).0, [12, 34, 56, 255]);
        fs::write(&path, b"not an icon").unwrap();
        assert!(decode_image(&path).is_err());
        fs::remove_file(path).unwrap();
        fs::remove_dir(root).unwrap();
    }
}
