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

use crate::shared::geometry::{Point, Rect};
use serde_json::Value;

pub struct WindowState {
    pub mode: String,
    pub shape: String,
    pub scale: f64,
    pub offset: Point,
    pub display: String,
    pub center: f64,
    pub visible: Rect,
    pub backing: Rect,
    pub transition: Option<u64>,
    pub pending: Option<Rect>,
    pub generation: u64,
    pub always_on_top: bool,
    pub manually_hidden: bool,
    pub manual_show_override: bool,
    pub auto_hidden: bool,
    pub visibility_generation: u64,
    pub passthrough_locked: bool,
    pub menu_anchor: Point,
    pub menu_ready: bool,
    pub menu_pending: bool,
    pub main_ready: bool,
    pub splash_done: bool,
    pub capture_payload: Option<Value>,
    pub capture_starting: bool,
    pub closing_effects: std::collections::HashMap<String, u64>,
    pub effect_generation: u64,
}
