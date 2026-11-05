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

//! 原生托盘菜单的打开、渲染就绪和定位。

use super::{create, emit, monitor_rect, set_rect, target_monitor};
use crate::shared::geometry;
use crate::shared::geometry::Point;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::json;
use tauri::AppHandle;
use tauri::Manager;

pub fn hide_menu(app: &AppHandle) -> Result<()> {
    app.state::<Desktop>().inner.lock().unwrap().menu_pending = false;
    if let Some(window) = app.get_webview_window("tray-menu") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn open_menu(app: &AppHandle, anchor: Point) -> Result<()> {
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        s.menu_anchor = anchor;
        s.menu_pending = true;
    }
    create(app, "tray-menu")?;
    flush_menu(app)
}

pub fn flush_menu(app: &AppHandle) -> Result<()> {
    let state = app.state::<Desktop>();
    let (ready, pending, top) = {
        let s = state.inner.lock().unwrap();
        (s.menu_ready, s.menu_pending, s.always_on_top)
    };
    if !ready || !pending {
        return Ok(());
    }
    let store = state.store.lock().unwrap();
    emit(
        app,
        "tray-menu",
        "tray-menu:open",
        json!([{
            "windowAvailable": app.get_webview_window("main").is_some(), "alwaysOnTop":top,
            "standaloneMode":store.value("standalone-window-mode", json!("inline")) == "standalone",
            "language":store.value("i18n-language", json!("zh-CN")),
        }]),
    )
}

pub fn reveal_menu(app: &AppHandle, height: f64) -> Result<()> {
    let (anchor, pending) = {
        let state = app.state::<Desktop>();
        let s = state.inner.lock().unwrap();
        (s.menu_anchor, s.menu_pending)
    };
    if !pending {
        return Ok(());
    }
    let monitor = app
        .monitor_from_point(anchor.x, anchor.y)
        .map_err(|e| e.to_string())?
        .unwrap_or(target_monitor(app)?);
    let rect = geometry::menu_rect(anchor, monitor_rect(&monitor), height);
    let window = create(app, "tray-menu")?;
    set_rect(&window, rect)?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}
