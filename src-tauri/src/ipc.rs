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

use crate::{
    capture,
    geometry::{Point, Rect},
    state::{normalize_scale, Desktop},
    windows::{self, Result},
};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_opener::OpenerExt;

fn text(value: &Value) -> Result<&str> {
    value.as_str().ok_or_else(|| "Expected string".into())
}
fn number(value: &Value) -> Result<f64> {
    value
        .as_f64()
        .filter(|v| v.is_finite())
        .ok_or_else(|| "Expected finite number".into())
}
fn source(window: &WebviewWindow, expected: &str) -> Result<()> {
    if window.label() == expected {
        Ok(())
    } else {
        Err(format!("Command restricted to {expected}"))
    }
}
fn store_write(app: &AppHandle, key: &str, value: &Value) -> Result<()> {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write(key, value)
}
fn cursor(app: &AppHandle) -> Result<Point> {
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

/// Route only explicitly supported desktop capabilities; remaining services fail clearly.
#[tauri::command]
pub async fn desktop_ipc(
    app: AppHandle,
    window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    if !windows::LABELS.contains(&window.label()) {
        return Err("Unknown command sender".into());
    }
    let a = args.first().unwrap_or(&Value::Null);
    let b = args.get(1).unwrap_or(&Value::Null);
    if let Some(result) = crate::settings::handle(&app, &channel, a)? {
        return Ok(result);
    }
    if let Some((base, operation)) = channel.rsplit_once(':') {
        let key = if base == "hotkey" {
            "hide-hotkey"
        } else {
            base
        };
        if let Some((_, default)) = SHORTCUTS.iter().find(|(k, _)| *k == key) {
            if operation == "get" {
                return Ok(app
                    .state::<Desktop>()
                    .store
                    .lock()
                    .unwrap()
                    .value(key, json!(default)));
            }
            if operation == "set" {
                let next = text(a)?;
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
                    return Ok(json!(true));
                }
                if let Some(shortcut) = parsed {
                    app.global_shortcut()
                        .register(shortcut)
                        .map_err(|e| e.to_string())?;
                }
                if let Err(error) = store_write(&app, key, a) {
                    if let Some(shortcut) = parsed {
                        let _ = app.global_shortcut().unregister(shortcut);
                    }
                    return Err(error);
                }
                if let Some(old) = old.as_str().and_then(|v| v.parse::<Shortcut>().ok()) {
                    app.global_shortcut()
                        .unregister(old)
                        .map_err(|e| e.to_string())?;
                }
                windows::broadcast(&app, base, a.clone())?;
                return Ok(json!(true));
            }
        }
    }
    if let Some(mode) = channel.strip_prefix("window:") {
        if crate::geometry::state_size(mode, false, 100.).is_some() {
            source(&window, "main")?;
            windows::resize(&app, mode, a.as_u64().unwrap_or(0).min(30000))?;
            return Ok(Value::Null);
        }
    }
    match channel.as_str() {
        #[cfg(debug_assertions)]
        "debug:transparency-underlay" => {
            source(&window, "main")?;
            let underlay = app
                .get_webview_window("standalone")
                .ok_or("Missing test underlay")?;
            let rect = app.state::<Desktop>().inner.lock().unwrap().backing;
            underlay
                .set_position(tauri::LogicalPosition::new(rect.x, rect.y))
                .map_err(|e| e.to_string())?;
            underlay
                .set_always_on_top(true)
                .map_err(|e| e.to_string())?;
            windows::raise_main(&app)?;
        }
        #[cfg(debug_assertions)]
        "debug:transparency-sample" => {
            source(&window, "main")?;
            let monitor = xcap::Monitor::all()
                .map_err(|e| e.to_string())?
                .into_iter()
                .find(|m| m.is_primary().unwrap_or(false))
                .ok_or("No primary monitor")?;
            let image = monitor.capture_image().map_err(|e| e.to_string())?;
            let rect = app.state::<Desktop>().inner.lock().unwrap().visible;
            let factor = window.scale_factor().map_err(|e| e.to_string())?;
            let points = [
                rect.x + 1.,
                rect.x + rect.width - 2.,
                rect.x + rect.width / 2.,
            ];
            let y = ((rect.y + rect.height - 2.) * factor) as i32
                - monitor.y().map_err(|e| e.to_string())?;
            let origin = monitor.x().map_err(|e| e.to_string())?;
            let colors = points
                .iter()
                .map(|x| {
                    let x = (*x * factor) as i32 - origin;
                    image.get_pixel_checked(x as u32, y as u32).map(|p| p.0)
                })
                .collect::<Vec<_>>();
            return Ok(json!(colors));
        }
        #[cfg(debug_assertions)]
        "debug:windows" => {
            return Ok(json!(app
                .webview_windows()
                .iter()
                .map(|(label, w)| json!({
                    "label":label,"visible":w.is_visible().ok(),"size":w.inner_size().ok(),
                    "position":w.outer_position().ok(),"scale":w.scale_factor().ok(),
                }))
                .collect::<Vec<_>>()));
        }
        #[cfg(debug_assertions)]
        "debug:open-window" => {
            source(&window, "main")?;
            let label = text(a)?;
            if label == "tray-menu" {
                windows::open_menu(&app, cursor(&app)?)?;
            } else {
                windows::create(&app, label)?;
            }
        }
        "window:renderer-ready" => match window.label() {
            "main" => {
                let scale = {
                    let state = app.state::<Desktop>();
                    let mut s = state.inner.lock().unwrap();
                    s.main_ready = true;
                    s.scale
                };
                window.set_zoom(scale / 100.).map_err(|e| e.to_string())?;
                windows::startup_complete(&app)?;
            }
            "standalone" | "guide" => {
                window.show().map_err(|e| e.to_string())?;
            }
            "capture" => capture::ready(&app)?,
            "cli-glow" | "agent-voice-input" => {
                window.show().map_err(|e| e.to_string())?;
                windows::raise_main(&app)?;
            }
            _ => {}
        },
        "window:transition:begin" => {
            source(&window, "main")?;
            let id = a
                .as_u64()
                .filter(|id| *id > 0)
                .ok_or("Invalid transition id")?;
            let state = app.state::<Desktop>();
            let mut s = state.inner.lock().unwrap();
            if s.transition != Some(id) {
                s.generation += 1;
                s.pending = None;
                s.transition = Some(id);
            }
        }
        "window:transition:complete" => {
            source(&window, "main")?;
            let generation = {
                let state = app.state::<Desktop>();
                let s = state.inner.lock().unwrap();
                if s.transition != a.as_u64() {
                    return Ok(Value::Null);
                }
                s.generation
            };
            windows::finish_resize(&app, generation)?;
        }
        "window:enable-mouse-passthrough" | "window:disable-mouse-passthrough" => {
            source(&window, "main")?;
            let locked = app
                .state::<Desktop>()
                .inner
                .lock()
                .unwrap()
                .passthrough_locked;
            window
                .set_ignore_cursor_events(locked || channel == "window:enable-mouse-passthrough")
                .map_err(|e| e.to_string())?;
        }
        "window:get-bounds" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().visible))
        }
        "window:get-mouse-position" => return Ok(json!(cursor(&app)?)),
        "window:get-mouse-window-state" => {
            return Ok(
                json!({"mousePosition":cursor(&app)?,"bounds":app.state::<Desktop>().inner.lock().unwrap().visible}),
            )
        }
        "window:move-delta" => {
            source(&window, "main")?;
            let (dx, dy) = (number(a)?.round(), number(b)?.round());
            if dx.abs() > 100000. || dy.abs() > 100000. {
                return Err("Move exceeds desktop bounds".into());
            }
            let (backing, visible) = {
                let state = app.state::<Desktop>();
                let mut s = state.inner.lock().unwrap();
                s.generation += 1;
                s.pending = None;
                s.transition = None;
                (
                    Rect {
                        x: s.backing.x + dx,
                        y: s.backing.y + dy,
                        ..s.backing
                    },
                    s.visible,
                )
            };
            windows::apply_geometry(
                &app,
                Rect::centered(
                    backing.x + backing.width / 2.,
                    backing.y,
                    visible.width,
                    visible.height,
                ),
                visible,
            )?;
        }
        "window:hide" => windows::hide_main(&app)?,
        "hide-process-list:get" => {
            return Ok(app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("hide-process-list", json!([])))
        }
        "hide-process-list:set" => {
            let values = a.as_array().ok_or("Expected a process name list")?;
            let names = values
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>();
            store_write(&app, "hide-process-list", &json!(names))?;
            crate::auto_hide::check(&app)?;
            return Ok(json!(true));
        }
        "hide-process-list:auto-hide-fullscreen:get" => {
            return Ok(app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("auto-hide-fullscreen-windows", json!(false)))
        }
        "hide-process-list:auto-hide-fullscreen:set" => {
            if !a.is_boolean() {
                return Err("Expected a boolean".into());
            }
            store_write(&app, "auto-hide-fullscreen-windows", a)?;
            windows::broadcast(&app, "store:auto-hide-fullscreen-windows", a.clone())?;
            crate::auto_hide::check(&app)?;
            return Ok(json!(true));
        }
        "hotkey:suspend" => {
            app.global_shortcut()
                .unregister_all()
                .map_err(|e| e.to_string())?;
            return Ok(json!(true));
        }
        "hotkey:resume" => {
            register_shortcuts(&app)?;
            return Ok(json!(true));
        }
        "settings:preview" => {
            let channel = text(a)?;
            if crate::settings::definition(channel).is_none() && !channel.starts_with("store:") {
                return Err("Unknown window preview setting".into());
            }
            windows::broadcast(&app, channel, b.clone())?;
            return Ok(json!(true));
        }
        "window:show" => windows::show_main(&app)?,
        "window:start-dragging" => window.start_dragging().map_err(|e| e.to_string())?,
        "window:minimize" => window.minimize().map_err(|e| e.to_string())?,
        "window:maximize" => {
            source(&window, "standalone")?;
            if window.is_maximized().map_err(|e| e.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
            .map_err(|e| e.to_string())?;
        }
        "window:close" => window.close().map_err(|e| e.to_string())?,
        "window:island-displays:list" => {
            let primary = app
                .primary_monitor()
                .map_err(|e| e.to_string())?
                .map(|m| windows::monitor_id(&m));
            return Ok(json!(app.available_monitors().map_err(|e| e.to_string())?.iter().map(|m| {
                let area = windows::monitor_rect(m); let id = windows::monitor_id(m);
                json!({"id":id,"width":area.width,"height":area.height,"isPrimary":Some(id) == primary})
            }).collect::<Vec<_>>()));
        }
        "window:island-display:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().display))
        }
        "window:island-display:set" => {
            let selection = text(a)?;
            if selection != "primary"
                && !app
                    .available_monitors()
                    .map_err(|e| e.to_string())?
                    .iter()
                    .any(|m| windows::monitor_id(m) == selection)
            {
                return Err("Unknown monitor".into());
            }
            store_write(&app, "island-display-id", a)?;
            app.state::<Desktop>().inner.lock().unwrap().display = selection.into();
            windows::reposition(&app)?;
            windows::broadcast(&app, "island:display", a.clone())?;
            return Ok(json!(true));
        }
        "window:island-position:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().offset))
        }
        "window:island-position:set" => {
            let offset = Point {
                x: number(&a["x"])?.round().clamp(-100000., 100000.),
                y: number(&a["y"])?.round().clamp(-100000., 100000.),
            };
            store_write(&app, "island-position-offset", &json!(offset))?;
            app.state::<Desktop>().inner.lock().unwrap().offset = offset;
            windows::reposition(&app)?;
            windows::emit(
                &app,
                "main",
                "window:island-position:changed",
                json!([offset]),
            )?;
            windows::broadcast(&app, "island:position", json!(offset))?;
            return Ok(json!(true));
        }
        "island:scale:get" => return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().scale)),
        "island:scale:set" => {
            let scale = normalize_scale(a);
            store_write(&app, "island-scale", &json!(scale))?;
            app.state::<Desktop>().inner.lock().unwrap().scale = scale;
            windows::main_window(&app)?
                .set_zoom(scale / 100.)
                .map_err(|e| e.to_string())?;
            windows::reposition(&app)?;
            windows::broadcast(&app, "island:scale", json!(scale))?;
            return Ok(json!(true));
        }
        "island:shape-mode:get" => {
            return Ok(json!(app.state::<Desktop>().inner.lock().unwrap().shape))
        }
        "island:shape-mode:set" => {
            set_shape(&app, text(a)?)?;
            return Ok(json!(true));
        }
        "app:open-standalone-window" => {
            windows::show_standalone(&app)?;
            return Ok(json!(true));
        }
        "app:close-standalone-window" => {
            if let Some(window) = app.get_webview_window("standalone") {
                window.close().map_err(|e| e.to_string())?;
            }
            return Ok(json!(true));
        }
        "splash:renderer-ready" => {
            source(&window, "splash")?;
            window.show().map_err(|e| e.to_string())?;
            windows::emit(&app, "splash", "splash:play-video", json!([]))?;
        }
        "splash:video-ended" => {
            source(&window, "splash")?;
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                let _ = windows::emit(&handle, "splash", "splash:fade-out", json!([]));
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                if let Err(error) = windows::close_splash(&handle) {
                    eprintln!("[Splash] {error}");
                }
            });
        }
        "guide:complete" => {
            source(&window, "guide")?;
            store_write(&app, "first-launch", &json!(false))?;
            window.close().map_err(|e| e.to_string())?;
        }
        "guide:reset" => {
            store_write(&app, "first-launch", &json!(true))?;
            return Ok(json!(true));
        }
        "tray-menu:mounted" => {
            source(&window, "tray-menu")?;
            app.state::<Desktop>().inner.lock().unwrap().menu_ready = true;
            windows::flush_menu(&app)?;
        }
        "tray-menu:ready" => {
            source(&window, "tray-menu")?;
            let height = number(a)?;
            if !(1. ..=10000.).contains(&height) {
                return Err("Invalid menu height".into());
            }
            windows::reveal_menu(&app, height.ceil())?;
        }
        "tray-menu:close" => {
            source(&window, "tray-menu")?;
            windows::hide_menu(&app)?;
        }
        "tray-menu:action" => {
            source(&window, "tray-menu")?;
            windows::hide_menu(&app)?;
            menu_action(&app, text(a)?)?;
        }
        "cli-glow:show" | "cli-glow:hide" => {
            windows::effect(&app, "cli-glow", channel.ends_with(":show"))?;
            return Ok(json!(true));
        }
        "agent-voice-input:show" | "agent-voice-input:hide" => {
            windows::effect(&app, "agent-voice-input", channel.ends_with(":show"))?;
            return Ok(json!(true));
        }
        "system:screenshot:region:start" => {
            capture::start(&app).await?;
            return Ok(json!(true));
        }
        "capture-cancel" => {
            source(&window, "capture")?;
            capture::close(&app)?;
        }
        "capture-complete" | "capture-save" => {
            source(&window, "capture")?;
            window.hide().map_err(|e| e.to_string())?;
            let result = if channel == "capture-complete" {
                capture::copy(a)
            } else {
                capture::save(a)
            };
            capture::close(&app)?;
            result?;
        }
        "clipboard:write-text" => {
            arboard::Clipboard::new()
                .map_err(|e| e.to_string())?
                .set_text(text(a)?)
                .map_err(|e| e.to_string())?;
        }
        "store:read" => return app.state::<Desktop>().store.lock().unwrap().read(text(a)?),
        "store:write" | "store:compare-and-swap" => {
            let key = text(a)?;
            let value = if channel == "store:write" {
                b
            } else {
                args.get(2).unwrap_or(&Value::Null)
            };
            {
                let state = app.state::<Desktop>();
                let store = state.store.lock().unwrap();
                if channel == "store:compare-and-swap" && store.read(key)? != *b {
                    return Ok(json!("conflict"));
                }
                store.write(key, value)?;
            }
            windows::broadcast(&app, &format!("store:{key}"), value.clone())?;
            if key == "standalone-window-mode" {
                if value == "standalone" {
                    windows::show_standalone(&app)?;
                } else if let Some(window) = app.get_webview_window("standalone") {
                    window.close().map_err(|e| e.to_string())?;
                }
            }
            return Ok(if channel == "store:write" {
                json!(true)
            } else {
                json!("updated")
            });
        }
        "app:quit" => app.exit(0),
        "app:restart" => app.restart(),
        "updater:version" => return Ok(json!(app.package_info().version.to_string())),
        "app:open-logs-folder" => {
            open_logs(&app)?;
            return Ok(json!(true));
        }
        "clipboard:open-url" => {
            let url = text(a)?;
            if !url.starts_with("https://") && !url.starts_with("http://") {
                return Err("Only HTTP(S) URLs are supported".into());
            }
            app.opener()
                .open_url(url, None::<&str>)
                .map_err(|e| e.to_string())?;
            return Ok(json!(true));
        }
        _ => return Err(format!("Service not migrated to Tauri yet: {channel}")),
    }
    Ok(Value::Null)
}

fn set_shape(app: &AppHandle, mode: &str) -> Result<()> {
    if !matches!(mode, "notch" | "pill") {
        return Err("Invalid shape mode".into());
    }
    store_write(app, "island-shape-mode", &json!(mode))?;
    app.state::<Desktop>().inner.lock().unwrap().shape = mode.into();
    windows::reposition(app)?;
    let rect = app.state::<Desktop>().inner.lock().unwrap().visible;
    windows::emit(
        app,
        "main",
        "island:shape-mode:changed",
        json!([mode, rect.x, rect.y]),
    )?;
    windows::broadcast(app, "island:shape-mode", json!(mode))
}
fn open_logs(app: &AppHandle) -> Result<()> {
    let path = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}
pub fn menu_action(app: &AppHandle, action: &str) -> Result<()> {
    match action {
        "show-island" => windows::show_main(app),
        "hide-island" => windows::hide_main(app),
        "open-settings" => {
            store_write(app, "standalone-window-active-tab", &json!("settings"))?;
            windows::broadcast(app, "store:standalone-window-active-tab", json!("settings"))?;
            windows::show_standalone(app)
        }
        "toggle-always-on-top" => {
            let enabled = {
                let state = app.state::<Desktop>();
                let mut s = state.inner.lock().unwrap();
                s.always_on_top = !s.always_on_top;
                s.always_on_top
            };
            for label in ["main", "cli-glow", "agent-voice-input"] {
                if let Some(window) = app.get_webview_window(label) {
                    window
                        .set_always_on_top(enabled)
                        .map_err(|e| e.to_string())?;
                }
            }
            windows::raise_main(app)
        }
        "open-log-folder" => open_logs(app),
        "quit" => {
            app.exit(0);
            Ok(())
        }
        "restart" => app.restart(),
        _ => Err("Unknown tray action".into()),
    }
}

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
];
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
