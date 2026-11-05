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

//! 协议输入校验与命令边界的通用参数读取。

use crate::{
    shared::{geometry::Point, Result},
    state::Desktop,
};
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};

pub(super) fn text(value: &Value) -> Result<&str> {
    value.as_str().ok_or_else(|| "Expected string".into())
}

pub(super) fn number(value: &Value) -> Result<f64> {
    value
        .as_f64()
        .filter(|v| v.is_finite())
        .ok_or_else(|| "Expected finite number".into())
}

pub(super) fn source(window: &WebviewWindow, expected: &str) -> Result<()> {
    if window.label() == expected {
        Ok(())
    } else {
        Err(format!("Command restricted to {expected}"))
    }
}

pub(super) fn store_write(app: &AppHandle, key: &str, value: &Value) -> Result<()> {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write(key, value)
}

pub(super) fn cursor(app: &AppHandle) -> Result<Point> {
    let point = app.cursor_position().map_err(|e| e.to_string())?;
    let factor = app
        .monitor_from_point(point.x, point.y)
        .map_err(|e| e.to_string())?
        .map(|m| m.scale_factor())
        .unwrap_or(1.);
    Ok(Point {
        x: point.x / factor,
        y: point.y / factor,
    })
}
