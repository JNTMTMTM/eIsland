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

//! Tray presentation and user interactions; window behavior belongs to windowing.

use crate::{features::windowing, shared::geometry::Point};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

pub(super) fn create(app: &tauri::App) -> tauri::Result<()> {
    let tray = TrayIconBuilder::with_id("eisland")
        .tooltip("eIsland")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let handle = tray.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                let result = match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => windowing::show_main(&handle),
                    TrayIconEvent::Click {
                        button: MouseButton::Right,
                        button_state: MouseButtonState::Up,
                        position,
                        ..
                    } => {
                        let factor = handle
                            .monitor_from_point(position.x, position.y)
                            .ok()
                            .flatten()
                            .map(|monitor| monitor.scale_factor())
                            .unwrap_or(1.);
                        windowing::open_menu(
                            &handle,
                            Point {
                                x: position.x / factor,
                                y: position.y / factor,
                            },
                        )
                    }
                    _ => Ok(()),
                };
                if let Err(error) = result {
                    eprintln!("[Tray] {error}");
                }
            });
        });
    if let Some(icon) = app.default_window_icon() {
        tray.icon(icon.clone()).build(app)?;
    } else {
        tray.build(app)?;
    }
    Ok(())
}
