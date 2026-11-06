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

//! 全局快捷键配置、注册与原生动作调度。

use super::{
    self as windows,
    actions::{menu_action, set_shape, store_write},
};
use crate::{
    features::capture,
    shared::{geometry::Point, Result},
    state::Desktop,
};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

const SHORTCUTS: &[(&str, &str)] = &[
    ("hide-hotkey", "Alt+X"),
    ("quit-hotkey", "Alt+C"),
    ("screenshot-hotkey", "Alt+A"),
    ("toggle-shape-mode-hotkey", "Alt+E"),
    ("agent-voice-input-hotkey", "Alt+P"),
    ("reset-position-hotkey", ""),
    ("show-settings-window-hotkey", ""),
    ("toggle-passthrough-hotkey", ""),
    ("toggle-tray-hotkey", ""),
    ("toggle-ui-lock-hotkey", ""),
    ("open-clipboard-history-hotkey", ""),
    ("next-song-hotkey", ""),
    ("play-pause-song-hotkey", ""),
];

pub(crate) fn handle(app: &AppHandle, channel: &str, a: &Value) -> Result<Option<Value>> {
    if channel == "hotkey:suspend" {
        app.global_shortcut()
            .unregister_all()
            .map_err(|error| error.to_string())?;
        return Ok(Some(json!(true)));
    }
    if channel == "hotkey:resume" {
        register_shortcuts(app)?;
        return Ok(Some(json!(true)));
    }
    if let Some((base, operation)) = channel.rsplit_once(':') {
        let key = if base == "hotkey" {
            "hide-hotkey"
        } else {
            base
        };
        if let Some((_, default)) = SHORTCUTS.iter().find(|(k, _)| *k == key) {
            if operation == "get" {
                return Ok(Some(
                    app.state::<Desktop>()
                        .store
                        .lock()
                        .unwrap()
                        .value(key, json!(default)),
                ));
            }
            if operation == "set" {
                let next = a.as_str().ok_or("Expected string")?;
                let parsed = if next.is_empty() {
                    None
                } else {
                    Some(next.parse::<Shortcut>().map_err(|e| e.to_string())?)
                };
                let old = app
                    .state::<Desktop>()
                    .store
                    .lock()
                    .unwrap()
                    .value(key, json!(default));
                if old == *a {
                    return Ok(Some(json!(true)));
                }
                let old_parsed = old.as_str().and_then(|v| v.parse::<Shortcut>().ok());
                let same_binding = parsed == old_parsed;
                if let Some(shortcut) = parsed.filter(|_| !same_binding) {
                    app.global_shortcut()
                        .register(shortcut)
                        .map_err(|e| e.to_string())?;
                }
                if let Err(error) = store_write(app, key, a) {
                    if let Some(shortcut) = parsed.filter(|_| !same_binding) {
                        let _ = app.global_shortcut().unregister(shortcut);
                    }
                    return Err(error);
                }
                // Recording suspends all shortcuts before saving. The previous
                // binding may already be released, or only its spelling changed.
                if let Some(old) = old_parsed
                    .filter(|old| !same_binding && app.global_shortcut().is_registered(*old))
                {
                    app.global_shortcut()
                        .unregister(old)
                        .map_err(|e| e.to_string())?;
                }
                windows::broadcast(app, base, a.clone())?;
                return Ok(Some(json!(true)));
            }
        }
    }
    Ok(None)
}

pub fn register_shortcuts(app: &AppHandle) -> Result<()> {
    let state = app.state::<Desktop>();
    let store = state.store.lock().unwrap();
    for (key, default) in SHORTCUTS {
        let value = store.value(key, json!(default));
        let shortcut = value.as_str().unwrap_or(default);
        if shortcut.is_empty() {
            continue;
        }
        let parsed: Shortcut = shortcut.parse().map_err(|e| format!("{key}: {e}"))?;
        // Resume can run repeatedly on blur/unmount, and saving while suspended
        // may have already registered one of the configured shortcuts.
        if app.global_shortcut().is_registered(parsed) {
            continue;
        }
        if let Err(error) = app.global_shortcut().register(parsed) {
            eprintln!("[Shortcut] {key}: {error}");
        }
    }
    Ok(())
}

pub fn shortcut_action(app: &AppHandle, pressed: &str) -> Result<()> {
    let action = {
        let state = app.state::<Desktop>();
        let store = state.store.lock().unwrap();
        SHORTCUTS.iter().find_map(|(key, default)| {
            let value = store.value(key, json!(default));
            value
                .as_str()
                .and_then(|v| v.parse::<Shortcut>().ok())
                .filter(|v| v.to_string() == pressed)
                .map(|_| *key)
        })
    };
    match action {
        Some("hide-hotkey") => {
            let hidden = {
                let state = app.state::<Desktop>();
                let s = state.inner.lock().unwrap();
                s.manually_hidden || s.auto_hidden
            };
            if hidden {
                windows::show_main(app)
            } else {
                windows::hide_main(app)
            }
        }
        Some("quit-hotkey") => {
            app.exit(0);
            Ok(())
        }
        Some("screenshot-hotkey") => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = capture::start(&handle).await {
                    eprintln!("[Capture] {error}");
                }
            });
            Ok(())
        }
        Some("toggle-shape-mode-hotkey") => {
            let shape = app.state::<Desktop>().inner.lock().unwrap().shape.clone();
            set_shape(app, if shape == "pill" { "notch" } else { "pill" })
        }
        Some("agent-voice-input-hotkey") => windows::effect(
            app,
            "agent-voice-input",
            app.get_webview_window("agent-voice-input").is_none(),
        ),
        Some("reset-position-hotkey") => {
            app.state::<Desktop>().inner.lock().unwrap().offset = Point::default();
            store_write(app, "island-position-offset", &json!(Point::default()))?;
            windows::reposition(app)
        }
        Some("show-settings-window-hotkey") => menu_action(app, "open-settings"),
        Some("next-song-hotkey" | "play-pause-song-hotkey") => {
            let handle = app.clone();
            let channel = if action == Some("next-song-hotkey") {
                "media:next"
            } else {
                "media:play-pause"
            };
            tauri::async_runtime::spawn(async move {
                if let Err(error) = crate::features::media::handle(&handle, channel, &[]).await {
                    eprintln!("[Media shortcut] {error}");
                }
            });
            Ok(())
        }
        Some("toggle-tray-hotkey") => {
            let tray = app.tray_by_id("eisland").ok_or("Tray unavailable")?;
            let visible = app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("tauri-tray-visible", json!(true))
                != false;
            tray.set_visible(!visible).map_err(|e| e.to_string())?;
            store_write(app, "tauri-tray-visible", &json!(!visible))
        }
        Some("toggle-ui-lock-hotkey") => {
            windows::broadcast(app, "shortcut:toggle-ui-lock", json!(true))
        }
        Some("open-clipboard-history-hotkey") => {
            if app.get_webview_window("capture").is_none() {
                windows::show_main(app)?;
            }
            windows::broadcast(app, "shortcut:open-clipboard-history", json!(true))
        }
        Some("toggle-passthrough-hotkey") => {
            let locked = {
                let state = app.state::<Desktop>();
                let mut s = state.inner.lock().unwrap();
                s.passthrough_locked = !s.passthrough_locked;
                s.passthrough_locked
            };
            windows::main_window(app)?
                .set_ignore_cursor_events(locked)
                .map_err(|e| e.to_string())?;
            windows::emit(
                app,
                "main",
                "window:passthrough-lock-changed",
                json!([locked]),
            )
        }
        _ => Ok(()),
    }
}
