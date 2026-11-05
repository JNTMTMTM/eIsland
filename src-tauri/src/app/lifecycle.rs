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

//! Process lifecycle; individual window teardown remains in the windowing feature.

use tauri::{AppHandle, RunEvent};

pub(super) fn on_event(app: &AppHandle, event: RunEvent) {
    match event {
        RunEvent::Resumed => crate::features::runtime::changed(app),
        RunEvent::Exit => super::services::stop(app),
        RunEvent::ExitRequested {
            api, code: None, ..
        } => {
            // Closing a secondary window keeps the tray-hosted runtime alive.
            api.prevent_exit();
        }
        _ => {}
    }
}
