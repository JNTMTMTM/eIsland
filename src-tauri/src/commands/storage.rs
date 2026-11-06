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

//! 业务设置存储与原子比较写入协议。

use super::input::text;
use crate::features::windowing as windows;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::{json, Value};
use tauri::Manager;
use tauri::{AppHandle, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "store:read" | "store:write" | "store:compare-and-swap"
    )
}

pub(super) fn handle(
    app: AppHandle,
    _window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    let b = args.get(1).unwrap_or(&Value::Null);
    match channel.as_str() {
        "store:read" => return app.state::<Desktop>().store.lock().unwrap().read(text(a)?),
        "store:write" | "store:compare-and-swap" => {
            let key = text(a)?;
            let value = if channel == "store:write" {
                b
            } else {
                args.get(2).unwrap_or(&Value::Null)
            };
            {
                let state = app.state::<Desktop>();
                let store = state.store.lock().unwrap();
                if channel == "store:compare-and-swap" && store.read(key)? != *b {
                    return Ok(json!("conflict"));
                }
                store.write(key, value)?;
            }
            windows::broadcast(&app, &format!("store:{key}"), value.clone())?;
            if key == "standalone-window-mode" {
                if value == "standalone" {
                    windows::show_standalone(&app)?;
                } else if let Some(window) = app.get_webview_window("standalone") {
                    window.close().map_err(|e| e.to_string())?;
                }
            }
            Ok(if channel == "store:write" {
                json!(true)
            } else {
                json!("updated")
            })
        }
        _ => Err(format!("Unknown native desktop operation: {channel}")),
    }
}
