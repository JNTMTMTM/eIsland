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
 
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod auto_hide;
mod capture;
mod geometry;
mod ipc;
mod native;
mod settings;
mod state;
mod windows;

use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = windows::show_main(&handle) {
                    eprintln!("[Instance] {error}");
                }
            });
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        return;
                    }
                    let handle = app.clone();
                    let shortcut = shortcut.to_string();
                    // WebView2 window creation must run outside the synchronous shortcut callback.
                    tauri::async_runtime::spawn(async move {
                        if let Err(error) = ipc::shortcut_action(&handle, &shortcut) {
                            eprintln!("[Shortcut] {error}");
                        }
                    });
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![ipc::desktop_ipc])
        .setup(|app| {
            let directory = app.path().app_data_dir()?.join("eIsland_store");
            #[cfg(debug_assertions)]
            let directory = std::env::var_os("EISLAND_DATA_DIR")
                .map(std::path::PathBuf::from)
                .unwrap_or(directory);
            app.manage(state::Desktop::new(directory));
            windows::create(app.handle(), "main")?;
            windows::reposition(app.handle())?;
            let scale = app.state::<state::Desktop>().inner.lock().unwrap().scale;
            app.state::<state::Desktop>()
                .inner
                .lock()
                .unwrap()
                .backing
                .width = 860. * scale / 100.;
            windows::reposition(app.handle())?;
            windows::main_window(app.handle())?.set_zoom(scale / 100.)?;
            let splash = app
                .state::<state::Desktop>()
                .store
                .lock()
                .unwrap()
                .value("startup-animation-enabled", serde_json::json!(true))
                != false;
            if splash {
                windows::create(app.handle(), "splash")?;
            } else {
                app.state::<state::Desktop>()
                    .inner
                    .lock()
                    .unwrap()
                    .splash_done = true;
            }
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
                            } => windows::show_main(&handle),
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
                                    .map(|m| m.scale_factor())
                                    .unwrap_or(1.);
                                windows::open_menu(
                                    &handle,
                                    geometry::Point {
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
            ipc::register_shortcuts(app.handle())?;
            auto_hide::start(app.handle());
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(8)).await;
                if let Err(error) = windows::close_splash(&handle) {
                    eprintln!("[Startup] {error}");
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Failed to initialize eIsland")
        .run(|_, event| {
            if let tauri::RunEvent::ExitRequested {
                api, code: None, ..
            } = event
            {
                // Closing a secondary window keeps the tray-hosted runtime alive.
                api.prevent_exit();
            }
        });
}
