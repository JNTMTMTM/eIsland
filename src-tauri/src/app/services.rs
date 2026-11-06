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

//! Application lifecycle composition; feature state remains owned by its feature.

use crate::features::{agent, downloads, images, media, music, runtime, system, updater};
use tauri::AppHandle;

/// Initialize each feature after shared paths and desktop preferences are managed.
pub(crate) fn start(app: &AppHandle) {
    system::start(app);
    media::start(app);
    music::start(app);
    downloads::start(app);
    images::start(app);
    updater::start(app);
    runtime::start(app);
    agent::start(app);
}
/// Stop owned workers before native application teardown.
pub(crate) fn stop(app: &AppHandle) {
    agent::stop();
    system::stop(app);
    media::stop(app);
    runtime::stop(app);
    music::stop(app);
}
