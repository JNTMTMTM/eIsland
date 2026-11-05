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

//! 窗口设置、显示器偏移与实时预览协议。

use super::input::{number, store_write, text};
use crate::features::windowing as windows;
use crate::features::windowing::actions;
use crate::shared::geometry::Point;
use crate::shared::Result;
use crate::state::normalize_scale;
use crate::state::Desktop;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "hide-process-list:get"
            | "hide-process-list:set"
            | "hide-process-list:auto-hide-fullscreen:get"
            | "hide-process-list:auto-hide-fullscreen:set"
            | "settings:preview"
            | "window:island-display:get"
            | "window:island-display:set"
            | "window:island-position:get"
            | "window:island-position:set"
            | "island:scale:get"
            | "island:scale:set"
            | "island:shape-mode:get"
            | "island:shape-mode:set"
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
        "hide-process-list:get" => {
            return Ok(app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("hide-process-list", json!([])))
        }
        "hide-process-list:set" => {
            let values = a.as_array().ok_or("Expected a process name list")?;
            let names = values
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>();
            store_write(&app, "hide-process-list", &json!(names))?;
            crate::features::windowing::auto_hide::check(&app)?;
            Ok(json!(true))
        }
        "hide-process-list:auto-hide-fullscreen:get" => {
            return Ok(app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("auto-hide-fullscreen-windows", json!(false)))
        }
        "hide-process-list:auto-hide-fullscreen:set" => {
            if !a.is_boolean() {
                return Err("Expected a boolean".into());
            }
            store_write(&app, "auto-hide-fullscreen-windows", a)?;
            windows::broadcast(&app, "store:auto-hide-fullscreen-windows", a.clone())?;
            crate::features::windowing::auto_hide::check(&app)?;
            Ok(json!(true))
        }
        "settings:preview" => {
            let channel = text(a)?;
            if crate::features::settings::definition(channel).is_none()
                && !channel.starts_with("store:")
                && !matches!(
                    channel,
                    "i18n:language"
                        | "notification:show"
                        | "settings:maxexpand-tab-animation"
                        | "settings:expand-tab-animation"
                )
            {
                return Err("Unknown window preview setting".into());
            }
            windows::broadcast(&app, channel, b.clone())?;
            Ok(json!(true))
        }
        "window:island-display:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().display))
        }
        "window:island-display:set" => {
            let selection = text(a)?;
            if selection != "primary"
                && !app
                    .available_monitors()
                    .map_err(|e| e.to_string())?
                    .iter()
                    .any(|m| windows::monitor_id(m) == selection)
            {
                return Err("Unknown monitor".into());
            }
            store_write(&app, "island-display-id", a)?;
            app.state::<Desktop>().inner.lock().unwrap().display = selection.into();
            windows::reposition(&app)?;
            windows::broadcast(&app, "island:display", a.clone())?;
            Ok(json!(true))
        }
        "window:island-position:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().offset))
        }
        "window:island-position:set" => {
            let offset = Point {
                x: number(&a["x"])?.round().clamp(-100000., 100000.),
                y: number(&a["y"])?.round().clamp(-100000., 100000.),
            };
            store_write(&app, "island-position-offset", &json!(offset))?;
            app.state::<Desktop>().inner.lock().unwrap().offset = offset;
            windows::reposition(&app)?;
            windows::emit(
                &app,
                "main",
                "window:island-position:changed",
                json!([offset]),
            )?;
            windows::broadcast(&app, "island:position", json!(offset))?;
            Ok(json!(true))
        }
        "island:scale:get" => return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().scale)),
        "island:scale:set" => {
            let scale = normalize_scale(a);
            store_write(&app, "island-scale", &json!(scale))?;
            app.state::<Desktop>().inner.lock().unwrap().scale = scale;
            windows::main_window(&app)?
                .set_zoom(scale / 100.)
                .map_err(|e| e.to_string())?;
            windows::reposition(&app)?;
            windows::broadcast(&app, "island:scale", json!(scale))?;
            Ok(json!(true))
        }
        "island:shape-mode:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().shape))
        }
        "island:shape-mode:set" => {
            actions::set_shape(&app, text(a)?)?;
            Ok(json!(true))
        }
        _ => Err(format!("Unknown native desktop operation: {channel}")),
    }
}
