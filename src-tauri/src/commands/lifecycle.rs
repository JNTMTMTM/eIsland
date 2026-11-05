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

//! 应用生命周期、引导与系统入口协议。

use super::input::{source, store_write, text};
use crate::features::windowing as windows;
use crate::features::windowing::actions;
use crate::shared::Result;
use serde_json::{json, Value};
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_opener::OpenerExt;

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "splash:renderer-ready"
            | "splash:video-ended"
            | "guide:complete"
            | "guide:reset"
            | "clipboard:write-text"
            | "app:quit"
            | "app:restart"
            | "updater:version"
            | "app:open-logs-folder"
            | "clipboard:open-url"
    )
}

pub(super) fn handle(
    app: AppHandle,
    window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    match channel.as_str() {
        "splash:renderer-ready" => {
            source(&window, "splash")?;
            window.show().map_err(|e| e.to_string())?;
            windows::emit(&app, "splash", "splash:play-video", json!([]))?;
        }
        "splash:video-ended" => {
            source(&window, "splash")?;
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                let _ = windows::emit(&handle, "splash", "splash:fade-out", json!([]));
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                if let Err(error) = windows::close_splash(&handle) {
                    eprintln!("[Splash] {error}");
                }
            });
        }
        "guide:complete" => {
            source(&window, "guide")?;
            store_write(&app, "first-launch", &json!(false))?;
            window.close().map_err(|e| e.to_string())?;
        }
        "guide:reset" => {
            store_write(&app, "first-launch", &json!(true))?;
            return Ok(json!(true));
        }
        "clipboard:write-text" => {
            arboard::Clipboard::new()
                .map_err(|e| e.to_string())?
                .set_text(text(a)?)
                .map_err(|e| e.to_string())?;
        }
        "app:quit" => app.exit(0),
        "app:restart" => app.restart(),
        "updater:version" => return Ok(json!(app.package_info().version.to_string())),
        "app:open-logs-folder" => {
            actions::open_logs(&app)?;
            return Ok(json!(true));
        }
        "clipboard:open-url" => {
            let url = text(a)?;
            if !url.starts_with("https://") && !url.starts_with("http://") {
                return Err("Only HTTP(S) URLs are supported".into());
            }
            app.opener()
                .open_url(url, None::<&str>)
                .map_err(|e| e.to_string())?;
            return Ok(json!(true));
        }
        _ => return Err(format!("Unknown native desktop operation: {channel}")),
    }
    Ok(Value::Null)
}
