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

/// Resolve the packaged converter, retaining the development binary fallback.
pub(crate) fn ffmpeg(app: &AppHandle) -> PathBuf {
    let name = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    if let Ok(resources) = app.path().resource_dir() {
        let file = resources.join("native/ffmpeg").join(name);
        if file.is_file() {
            return file;
        }
    }
    #[cfg(debug_assertions)]
    {
        let file = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../node_modules/ffmpeg-static")
            .join(name);
        if file.is_file() {
            return file;
        }
    }
    PathBuf::from(name)
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
