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

//! 窗口业务入口与事件发布；各子模块负责创建、布局、可见性、效果和托盘。

use crate::shared::Result;
use serde_json::json;
use serde_json::Value;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use tauri::WebviewWindow;

pub(crate) mod actions;
pub(crate) mod auto_hide;
mod creation;
pub(crate) mod shortcuts;
pub(crate) use creation::create;
mod layout;
pub(crate) use layout::{
    apply_geometry, finish_resize, monitor_id, monitor_rect, reposition, resize, set_rect,
    target_monitor,
};
mod visibility;
pub(crate) use visibility::{
    close_splash, hide_main, raise_main, restore_after_capture, show_main, show_standalone,
    startup_complete,
};
mod tray;
pub(crate) use tray::{flush_menu, hide_menu, open_menu, reveal_menu};
mod effects;
pub(crate) use effects::effect;

pub const LABELS: &[&str] = &[
    "main",
    "splash",
    "guide",
    "standalone",
    "tray-menu",
    "capture",
    "agent-voice-input",
    "cli-glow",
];

pub fn emit(app: &AppHandle, label: &str, channel: &str, args: Value) -> Result<()> {
    app.emit_to(label, "eisland-ipc", json!({"channel":channel,"args":args}))
        .map_err(|e| e.to_string())
}

pub fn broadcast(app: &AppHandle, channel: &str, value: Value) -> Result<()> {
    app.emit(
        "eisland-ipc",
        json!({"channel":"settings:changed","args":[channel,value]}),
    )
    .map_err(|e| e.to_string())
}

pub fn main_window(app: &AppHandle) -> Result<WebviewWindow> {
    app.get_webview_window("main")
        .ok_or_else(|| "Main window unavailable".into())
}
