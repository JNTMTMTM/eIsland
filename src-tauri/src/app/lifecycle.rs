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
        RunEvent::Exit => {
            super::services::stop(app);
            // The instrumented desktop must flush before the native event loop
            // terminates; do not rely on the GUI process's CRT exit handlers.
            #[cfg(coverage)]
            flush_coverage();
        }
        RunEvent::ExitRequested {
            api, code: None, ..
        } => {
            // Closing a secondary window keeps the tray-hosted runtime alive.
            api.prevent_exit();
        }
        _ => {}
    }
}

#[cfg(coverage)]
fn flush_coverage() {
    unsafe extern "C" {
        fn __llvm_profile_write_file() -> std::ffi::c_int;
    }
    // SAFETY: Rust's instrument-coverage runtime supplies this no-argument API.
    if unsafe { __llvm_profile_write_file() } != 0 {
        eprintln!("[Coverage] Failed to flush native execution profile");
    }
}
