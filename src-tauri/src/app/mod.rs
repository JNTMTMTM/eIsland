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

//! Application composition: plugins, startup and process lifecycle.

mod lifecycle;
pub(crate) mod services;
mod setup;
mod tray;

use crate::{commands, features};

pub(crate) fn run() {
    if features::updater::run_verification_cli() {
        return;
    }
    // Hooks use stdin/stdout and must finish before single-instance or GUI setup.
    if features::agent::run_hook_cli() {
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = features::windowing::show_main(&handle) {
                    eprintln!("[Instance] {error}");
                }
            });
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        return;
                    }
                    let handle = app.clone();
                    let shortcut = shortcut.to_string();
                    // WebView2 creation must stay outside the synchronous callback.
                    tauri::async_runtime::spawn(async move {
                        if let Err(error) =
                            features::windowing::shortcuts::shortcut_action(&handle, &shortcut)
                        {
                            eprintln!("[Shortcut] {error}");
                        }
                    });
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![commands::desktop::desktop_ipc])
        .setup(setup::initialize)
        .build(tauri::generate_context!())
        .expect("Failed to initialize eIsland")
        .run(lifecycle::on_event);
}
