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

//! 原生桌面命令入口：调用方鉴权、域服务分发与未知命令拒绝。

use super::{capture, input::source, lifecycle, services, storage, tray, window, window_settings};
use crate::{
    features::{self, windowing},
    shared::Result,
};
use serde_json::Value;
use tauri::{AppHandle, WebviewWindow};

#[tauri::command]
pub async fn desktop_ipc(
    app: AppHandle,
    window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    if !windowing::LABELS.contains(&window.label()) {
        return Err("Unknown command sender".into());
    }
    if matches!(
        channel.as_str(),
        "capture-ocr" | "capture-ocr-local" | "capture-translate"
    ) {
        source(&window, "capture")?;
    }
    if matches!(
        channel.as_str(),
        "updater:startup-auto-check-ready" | "updater:startup-auto-check-received"
    ) {
        source(&window, "main")?;
    }
    if features::agent::handles(&channel) {
        return features::agent::handle(&app, window.label(), &channel, &args).await;
    }
    if channel == "runtime:schedule-wakeup" {
        return features::runtime::schedule(&app, window.label(), &args);
    }
    let value = args.first().unwrap_or(&Value::Null);
    if matches!(
        channel.as_str(),
        "island:autostart:get" | "island:autostart:set"
    ) {
        return features::settings::autostart::handle(&app, &channel, value).await;
    }
    if let Some(result) = services::handle(&app, &channel, &args).await {
        return result;
    }
    if let Some(result) = features::settings::handle(&app, &channel, value)? {
        return Ok(result);
    }
    if let Some(result) = windowing::shortcuts::handle(&app, &channel, value)? {
        return Ok(result);
    }
    #[cfg(debug_assertions)]
    if super::debug::handles(&channel) {
        return super::debug::handle(app, window, channel, args);
    }
    if window::handles(&channel) {
        return window::handle(app, window, channel, args);
    }
    if window_settings::handles(&channel) {
        return window_settings::handle(app, window, channel, args);
    }
    if tray::handles(&channel) {
        return tray::handle(app, window, channel, args);
    }
    if capture::handles(&channel) {
        return capture::handle(app, window, channel, args).await;
    }
    if storage::handles(&channel) {
        return storage::handle(app, window, channel, args);
    }
    if lifecycle::handles(&channel) {
        return lifecycle::handle(app, window, channel, args);
    }
    Err(format!("Unknown native desktop operation: {channel}"))
}
