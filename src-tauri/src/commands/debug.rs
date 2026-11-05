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

//! 仅调试构建启用的桌面验收命令。

use super::input::{cursor, source, text};
use crate::features::windowing as windows;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::{json, Value};
use tauri::Manager;
use tauri::{AppHandle, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "debug:system-services"
            | "debug:transparency-underlay"
            | "debug:transparency-sample"
            | "debug:windows"
            | "debug:open-window"
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
        #[cfg(debug_assertions)]
        "debug:system-services" => {
            let media = app.state::<std::sync::Arc<crate::features::media::Media>>();
            let helper = crate::features::extensions::resolve_native_helper;
            return Ok(json!({
                "media":media.diagnostics(),
                "volumeHelper":helper(&app,"volume","eIslandVolumeHelper.exe").ok(),
                "brightnessHelper":helper(&app,"brightness","eIslandBrightnessReader.exe").ok(),
                "smtcLibrary":helper(&app,"smtc","eIslandSmtcHelper.dll").ok(),
            }));
        }
        #[cfg(debug_assertions)]
        "debug:transparency-underlay" => {
            source(&window, "main")?;
            let underlay = app
                .get_webview_window("standalone")
                .ok_or("Missing test underlay")?;
            let rect = app.state::<Desktop>().inner.lock().unwrap().backing;
            underlay
                .set_position(tauri::LogicalPosition::new(rect.x, rect.y))
                .map_err(|e| e.to_string())?;
            underlay
                .set_always_on_top(true)
                .map_err(|e| e.to_string())?;
            windows::raise_main(&app)?;
        }
        #[cfg(debug_assertions)]
        "debug:transparency-sample" => {
            source(&window, "main")?;
            let monitor = xcap::Monitor::all()
                .map_err(|e| e.to_string())?
                .into_iter()
                .find(|m| m.is_primary().unwrap_or(false))
                .ok_or("No primary monitor")?;
            let image = monitor.capture_image().map_err(|e| e.to_string())?;
            let rect = app.state::<Desktop>().inner.lock().unwrap().visible;
            let factor = window.scale_factor().map_err(|e| e.to_string())?;
            let points = [
                rect.x + 1.,
                rect.x + rect.width - 2.,
                rect.x + rect.width / 2.,
            ];
            let y = ((rect.y + rect.height - 2.) * factor) as i32
                - monitor.y().map_err(|e| e.to_string())?;
            let origin = monitor.x().map_err(|e| e.to_string())?;
            let colors = points
                .iter()
                .map(|x| {
                    let x = (*x * factor) as i32 - origin;
                    image.get_pixel_checked(x as u32, y as u32).map(|p| p.0)
                })
                .collect::<Vec<_>>();
            return Ok(json!(colors));
        }
        #[cfg(debug_assertions)]
        "debug:windows" => {
            return Ok(json!(app
                .webview_windows()
                .iter()
                .map(|(label, w)| json!({
                    "label":label,"visible":w.is_visible().ok(),"size":w.inner_size().ok(),
                    "position":w.outer_position().ok(),"scale":w.scale_factor().ok(),
                }))
                .collect::<Vec<_>>()));
        }
        #[cfg(debug_assertions)]
        "debug:open-window" => {
            source(&window, "main")?;
            let label = text(a)?;
            if label == "tray-menu" {
                windows::open_menu(&app, cursor(&app)?)?;
            } else {
                windows::create(&app, label)?;
            }
        }
        _ => return Err(format!("Unknown native desktop operation: {channel}")),
    }
    Ok(Value::Null)
}
