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

mod hardware;
mod media;
mod media_state;
#[cfg(windows)]
mod smtc;

use crate::windows::Result;
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
use tauri::{AppHandle, Manager};

pub struct Services {
    pub hardware: hardware::Hardware,
    pub media: Arc<media::Media>,
    pub stopped: Arc<AtomicBool>,
    shutdown: tokio::sync::watch::Sender<bool>,
}

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
        "Native helper missing: {component}/{file}; run npm run native:tauri"
    ))
}

impl Services {
    #[cfg(debug_assertions)]
    pub fn diagnostics(app: &AppHandle) -> Value {
        json_diagnostics(app)
    }
    pub fn start(app: &AppHandle) {
        let (shutdown, receiver) = tokio::sync::watch::channel(false);
        let stopped = Arc::new(AtomicBool::new(false));
        let hardware = hardware::Hardware::new();
        let media = Arc::new(media::Media::new());
        app.manage(Self {
            hardware,
            media: media.clone(),
            stopped: stopped.clone(),
            shutdown,
        });
        hardware::start(app, receiver);
        media.start(app, stopped);
    }
    pub fn stop(&self) {
        self.stopped.store(true, Ordering::Release);
        let _ = self.shutdown.send(true);
    }
}

#[cfg(debug_assertions)]
fn json_diagnostics(app: &AppHandle) -> Value {
    serde_json::json!({
        "media":app.state::<Services>().media.diagnostics(),
        "volumeHelper":native_path(app,"volume","eIslandVolumeHelper.exe").ok(),
        "brightnessHelper":native_path(app,"brightness","eIslandBrightnessReader.exe").ok(),
        "smtcLibrary":native_path(app,"smtc","eIslandSmtcHelper.dll").ok(),
    })
}

pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Option<Result<Value>> {
    if hardware::handles(channel) {
        return Some(hardware::handle(app, channel, args).await);
    }
    if media::handles(channel) {
        return Some(media::handle(app, channel, args).await);
    }
    None
}
