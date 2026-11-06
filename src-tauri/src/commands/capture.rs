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

//! 截图窗口操作与原生截图命令。

use super::input::source;
use crate::features::capture;
use crate::shared::Result;
use serde_json::{json, Value};
use tauri::{AppHandle, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "system:screenshot:region:start"
            | "system:screenshot"
            | "capture-cancel"
            | "capture-complete"
            | "capture-save"
    )
}

pub(super) async fn handle(
    app: AppHandle,
    window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    match channel.as_str() {
        "system:screenshot:region:start" => {
            capture::start(&app).await?;
            return Ok(json!(true));
        }
        "system:screenshot" => return capture::primary(&app).await,
        "capture-cancel" => {
            source(&window, "capture")?;
            capture::close(&app)?;
        }
        "capture-complete" | "capture-save" => {
            source(&window, "capture")?;
            window.hide().map_err(|e| e.to_string())?;
            let result = if channel == "capture-complete" {
                capture::copy(a)
            } else {
                capture::save(a)
            };
            capture::close(&app)?;
            result?;
        }
        _ => return Err(format!("Unknown native desktop operation: {channel}")),
    }
    Ok(Value::Null)
}
