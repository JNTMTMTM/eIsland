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

//! 托盘菜单就绪、尺寸与动作协议。

use super::input::{number, source, text};
use crate::features::windowing as windows;
use crate::features::windowing::actions;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "tray-menu:mounted" | "tray-menu:ready" | "tray-menu:close" | "tray-menu:action"
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
        "tray-menu:mounted" => {
            source(&window, "tray-menu")?;
            app.state::<Desktop>().inner.lock().unwrap().menu_ready = true;
            windows::flush_menu(&app)?;
        }
        "tray-menu:ready" => {
            source(&window, "tray-menu")?;
            let height = number(a)?;
            if !(1. ..=10000.).contains(&height) {
                return Err("Invalid menu height".into());
            }
            windows::reveal_menu(&app, height.ceil())?;
        }
        "tray-menu:close" => {
            source(&window, "tray-menu")?;
            windows::hide_menu(&app)?;
        }
        "tray-menu:action" => {
            source(&window, "tray-menu")?;
            windows::hide_menu(&app)?;
            actions::menu_action(&app, text(a)?)?;
        }
        _ => return Err(format!("Unknown native desktop operation: {channel}")),
    }
    Ok(Value::Null)
}
