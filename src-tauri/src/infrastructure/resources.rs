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

//! Bundled native executables and browser resources, independent of business features.

use crate::shared::Result;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn native_path(app: &AppHandle, component: &str, file: &str) -> Result<PathBuf> {
    let rid = match std::env::consts::ARCH {
        "x86_64" => "win-x64",
        "aarch64" => "win-arm64",
        "x86" => "win-x86",
        arch => return Err(format!("Unsupported native architecture: {arch}")),
    };
    let resource = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("native")
        .join(rid)
        .join(component)
        .join(file);
    if resource.is_file() {
        return Ok(resource);
    }
    #[cfg(debug_assertions)]
    {
        let development = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources/native")
            .join(rid)
            .join(component)
            .join(file);
        if development.is_file() {
            return Ok(development);
        }
    }
    Err(format!(
        "Native helper missing: {component}/{file}; run npm run plugins:build"
    ))
}

/// Resolve bundled media tools; production never falls back to the user's PATH.
fn media_binary(app: &AppHandle, tool: &str) -> Result<PathBuf> {
    let name = format!("{tool}{}", if cfg!(windows) { ".exe" } else { "" });
    if let Ok(resources) = app.path().resource_dir() {
        let file = resources.join("native/ffmpeg").join(&name);
        if file.is_file() {
            return Ok(file);
        }
    }
    #[cfg(debug_assertions)]
    {
        let override_name = format!("{}_BIN", tool.to_ascii_uppercase());
        if let Some(path) = std::env::var_os(override_name)
            .map(PathBuf::from)
            .filter(|path| path.is_file())
        {
            return Ok(path);
        }
        let resources = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources/native/ffmpeg")
            .join(&name);
        if resources.is_file() {
            return Ok(resources);
        }
        if tool == "ffmpeg" {
            let development = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../node_modules/ffmpeg-static")
                .join(&name);
            if development.is_file() {
                return Ok(development);
            }
        }
    }
    Err(format!("Bundled {tool} missing; run npm run plugins:build"))
}
/// Existing callers report a missing converter through the shared process error path.
pub(crate) fn ffmpeg(app: &AppHandle) -> PathBuf {
    media_binary(app, "ffmpeg").unwrap_or_else(|_| {
        app.path()
            .resource_dir()
            .unwrap_or_else(|_| std::env::temp_dir().join("eisland-unavailable-resources"))
            .join("native/ffmpeg")
            .join(if cfg!(windows) {
                "ffmpeg.exe"
            } else {
                "ffmpeg"
            })
    })
}
/// Metadata requires the bundled ffprobe; no global executable is consulted.
pub(crate) fn ffprobe(app: &AppHandle) -> Result<PathBuf> {
    media_binary(app, "ffprobe")
}
/// Resolve an embedded browser SDK directory, preserving the development resource fallback.
pub(crate) fn browser_assets(app: &AppHandle, name: &str, entry: &str) -> Result<PathBuf> {
    let resources = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join(name);
    #[cfg(debug_assertions)]
    {
        if !resources.join(entry).is_file() {
            return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../resources")
                .join(name));
        }
    }
    let _ = entry;
    Ok(resources)
}
