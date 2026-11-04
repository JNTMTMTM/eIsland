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
    geometry::{self, Point, Rect},
    native,
    state::Desktop,
};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

pub type Result<T> = std::result::Result<T, String>;
pub const LABELS: &[&str] = &[
    "main",
    "splash",
    "guide",
    "standalone",
    "tray-menu",
    "capture",
    "agent-voice-input",
    "cli-glow",
];

pub fn emit(app: &AppHandle, label: &str, channel: &str, args: Value) -> Result<()> {
    app.emit_to(label, "eisland-ipc", json!({"channel":channel,"args":args}))
        .map_err(|e| e.to_string())
}
pub fn broadcast(app: &AppHandle, channel: &str, value: Value) -> Result<()> {
    app.emit(
        "eisland-ipc",
        json!({"channel":"settings:changed","args":[channel,value]}),
    )
    .map_err(|e| e.to_string())
}
pub fn main_window(app: &AppHandle) -> Result<WebviewWindow> {
    app.get_webview_window("main")
        .ok_or_else(|| "Main window unavailable".into())
}
pub fn monitor_rect(monitor: &tauri::Monitor) -> Rect {
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    Rect {
        x: area.position.x as f64 / scale,
        y: area.position.y as f64 / scale,
        width: area.size.width as f64 / scale,
        height: area.size.height as f64 / scale,
    }
}
pub fn monitor_id(monitor: &tauri::Monitor) -> String {
    // Display names stay stable across enumeration order changes.
    monitor
        .name()
        .cloned()
        .unwrap_or_else(|| format!("{},{}", monitor.position().x, monitor.position().y))
}
pub fn target_monitor(app: &AppHandle) -> Result<tauri::Monitor> {
    let selected = app.state::<Desktop>().inner.lock().unwrap().display.clone();
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    monitors
        .into_iter()
        .find(|m| monitor_id(m) == selected)
        .or(app.primary_monitor().map_err(|e| e.to_string())?)
        .ok_or_else(|| "No display found".into())
}
pub fn set_rect(window: &WebviewWindow, rect: Rect) -> Result<()> {
    window
        .set_size(tauri::LogicalSize::new(rect.width, rect.height))
        .map_err(|e| e.to_string())?;
    window
        .set_position(tauri::LogicalPosition::new(rect.x, rect.y))
        .map_err(|e| e.to_string())
}

/// Create one of the fixed local pages; arbitrary labels and URLs are rejected.
pub fn create(app: &AppHandle, label: &str) -> Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(label) {
        return Ok(window);
    }
    let (page, width, height) = match label {
        "main" => ("html/DynamicIslandIndex.html", 860., 42.),
        "splash" => ("html/DynamicIslandSplash.html", 600., 400.),
        "guide" => ("html/DynamicIslandGuide.html", 860., 500.),
        "standalone" => ("html/DynamicIslandStandalone.html", 1155., 640.),
        "tray-menu" => ("html/DynamicIslandTrayMenu.html?theme=dark", 272., 373.),
        "capture" => ("capture.html", 800., 600.),
        "agent-voice-input" | "cli-glow" => {
            ("html/DynamicIslandAibackground/index.html", 800., 600.)
        }
        _ => return Err("Unknown window label".into()),
    };
    let effect = matches!(label, "agent-voice-input" | "cli-glow");
    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App(page.into()));
    #[cfg(debug_assertions)]
    let builder = if let Some(directory) = std::env::var_os("EISLAND_WEBVIEW_DATA_DIR") {
        builder.data_directory(std::path::PathBuf::from(directory))
    } else {
        builder
    };
    // Transparent WebView2 content must not expose the HWND's redirected background
    // when SetWindowRgn changes the visible area during an island transition.
    #[cfg(windows)]
    let builder = builder.no_redirection_bitmap(label != "standalone");
    #[cfg(debug_assertions)]
    let builder = if let Ok(args) = std::env::var("EISLAND_WEBVIEW_DEBUG_ARGS") {
        builder.additional_browser_args(&args)
    } else {
        builder
    };
    let external_app = app.clone();
    let window = builder
        .title("eIsland")
        .inner_size(width, height)
        .visible(false)
        .decorations(false)
        .transparent(label != "standalone")
        .background_color(if label == "standalone" {
            tauri::webview::Color(0, 0, 0, 255)
        } else {
            tauri::webview::Color(0, 0, 0, 0)
        })
        .shadow(label == "splash")
        .resizable(label == "standalone")
        .skip_taskbar(label != "standalone" && label != "guide")
        .always_on_top(label != "standalone" && label != "guide")
        .focused(false)
        .focusable(!effect && label != "splash")
        .on_new_window(move |url, _features| {
            if matches!(url.scheme(), "http" | "https") {
                if let Err(error) = external_app.opener().open_url(url.as_str(), None::<&str>) {
                    eprintln!("[Window] open external URL: {error}");
                }
            }
            tauri::webview::NewWindowResponse::Deny
        })
        .on_navigation(|url| {
            matches!(url.scheme(), "tauri" | "http" | "https")
                && matches!(
                    url.host_str(),
                    Some("tauri.localhost" | "localhost" | "127.0.0.1")
                )
        })
        .build()
        .map_err(|e| e.to_string())?;
    if label == "standalone" {
        window
            .set_min_size(Some(tauri::LogicalSize::new(1155., 640.)))
            .map_err(|e| e.to_string())?;
    }
    if matches!(label, "guide" | "splash" | "standalone") {
        window.center().map_err(|e| e.to_string())?;
    }
    if effect {
        let monitor = main_window(app)?
            .current_monitor()
            .map_err(|e| e.to_string())?
            .unwrap_or(target_monitor(app)?);
        window
            .set_position(*monitor.position())
            .map_err(|e| e.to_string())?;
        window
            .set_size(*monitor.size())
            .map_err(|e| e.to_string())?;
        window
            .set_ignore_cursor_events(true)
            .map_err(|e| e.to_string())?;
        window
            .set_always_on_top(app.state::<Desktop>().inner.lock().unwrap().always_on_top)
            .map_err(|e| e.to_string())?;
    }
    let handle = app.clone();
    let kind = label.to_owned();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            crate::services::agent::cancel_window(&kind);
            crate::services::runtime::cancel_window(&handle, &kind);
        }
        let result = match event {
            tauri::WindowEvent::Focused(false) if kind == "tray-menu" => hide_menu(&handle),
            tauri::WindowEvent::Destroyed if kind == "capture" => {
                let app = handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = restore_after_capture(&app) {
                        eprintln!("[Capture] restore: {error}");
                    }
                });
                Ok(())
            }
            tauri::WindowEvent::Destroyed if kind == "main" => {
                let state = handle.state::<Desktop>();
                let mut state = state.inner.lock().unwrap();
                state.main_ready = false;
                state.pending = None;
                state.transition = None;
                state.generation += 1;
                Ok(())
            }
            tauri::WindowEvent::ScaleFactorChanged { .. } if kind == "main" => reposition(&handle),
            _ => Ok(()),
        };
        if let Err(error) = result {
            eprintln!("[Window:{kind}] {error}");
        }
    });
    Ok(window)
}

pub fn apply_geometry(app: &AppHandle, target: Rect, visible: Rect) -> Result<()> {
    let window = main_window(app)?;
    let backing_width = app.state::<Desktop>().inner.lock().unwrap().backing.width;
    let backing = geometry::backing_rect(target, backing_width);
    set_rect(
        &window,
        Rect {
            height: visible.height,
            ..backing
        },
    )?;
    native::clip(&window, backing, visible)?;
    let state = app.state::<Desktop>();
    let mut state = state.inner.lock().unwrap();
    state.backing = Rect {
        height: visible.height,
        ..backing
    };
    state.visible = Rect::centered(
        backing.x + backing.width / 2.,
        backing.y,
        visible.width,
        visible.height,
    );
    Ok(())
}

pub fn reposition(app: &AppHandle) -> Result<()> {
    let area = monitor_rect(&target_monitor(app)?);
    let target = {
        let state = app.state::<Desktop>();
        let mut state = state.inner.lock().unwrap();
        state.center = area.x + area.width / 2. + state.offset.x;
        let (width, height) =
            geometry::state_size(&state.mode, state.shape == "pill", state.scale).unwrap();
        let y = area.y
            + if state.shape == "pill" {
                46. + state.offset.y
            } else {
                0.
            };
        state.generation += 1;
        state.pending = None;
        state.transition = None;
        Rect::centered(state.center, y, width, height)
    };
    apply_geometry(app, target, target)
}

/// Grow immediately; defer shrinking until the exact renderer transition completes.
pub fn resize(app: &AppHandle, mode: &str, delay_ms: u64) -> Result<()> {
    let area = monitor_rect(&target_monitor(app)?);
    let (target, protected, generation, wait) = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        let (width, height) =
            geometry::state_size(mode, s.shape == "pill", s.scale).ok_or("Invalid island state")?;
        s.mode = mode.into();
        let center = if s.shape == "pill" {
            s.backing.x + s.backing.width / 2.
        } else {
            s.center
        };
        let y = if s.shape == "pill" {
            s.backing.y
        } else {
            area.y
        };
        let target = Rect::centered(center, y, width, height);
        if s.pending == Some(target) && delay_ms > 0 {
            return Ok(());
        }
        s.generation += 1;
        if delay_ms == 0 {
            s.transition = None;
        }
        let shrinking = delay_ms > 0
            && (s.visible.width > width || s.visible.height > height || s.visible.y != y);
        s.pending = if shrinking { Some(target) } else { None };
        let protected = Rect::centered(
            s.backing.x + s.backing.width / 2.,
            s.backing.y,
            s.visible.width.max(width),
            s.visible.height.max(height),
        );
        (
            target,
            protected,
            s.generation,
            if s.transition.is_some() {
                (delay_ms.saturating_mul(3)).clamp(5000, 30000)
            } else {
                delay_ms.min(30000)
            },
        )
    };
    let pending = app
        .state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .pending
        .is_some();
    if !pending {
        return apply_geometry(app, target, target);
    }
    apply_geometry(
        app,
        Rect {
            x: protected.x + (protected.width - target.width) / 2.,
            y: protected.y,
            ..target
        },
        protected,
    )?;
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(wait)).await;
        if let Err(error) = finish_resize(&handle, generation) {
            eprintln!("[Window] resize: {error}");
        }
    });
    Ok(())
}
pub fn finish_resize(app: &AppHandle, generation: u64) -> Result<()> {
    let target = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if s.generation != generation {
            return Ok(());
        }
        s.transition = None;
        s.pending.take()
    };
    if let Some(target) = target {
        apply_geometry(app, target, target)?;
    }
    Ok(())
}

pub fn show_main(app: &AppHandle) -> Result<()> {
    let existed = app.get_webview_window("main").is_some();
    let window = create(app, "main")?;
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        s.manually_hidden = false;
        s.auto_hidden = false;
        s.manual_show_override = true;
        s.visibility_generation += 1;
    }
    if app.get_webview_window("capture").is_some()
        || app
            .state::<Desktop>()
            .inner
            .lock()
            .unwrap()
            .capture_starting
    {
        return Ok(());
    }
    if !existed {
        reposition(app)?;
        return Ok(());
    }
    if !window.is_visible().map_err(|e| e.to_string())? {
        window.eval("document.documentElement.style.transition='none';document.documentElement.style.opacity='0';").map_err(|e|e.to_string())?;
    }
    emit(app, "main", "island:show", json!([]))?;
    window.show().map_err(|e| e.to_string())?;
    window.eval("requestAnimationFrame(()=>{document.documentElement.style.transition='opacity 180ms ease-out';document.documentElement.style.opacity='1';});").map_err(|e|e.to_string())?;
    raise_main(app)
}
pub fn raise_main(app: &AppHandle) -> Result<()> {
    let window = main_window(app)?;
    let topmost = app.state::<Desktop>().inner.lock().unwrap().always_on_top;
    window
        .set_always_on_top(topmost)
        .map_err(|e| e.to_string())?;
    native::raise(&window, topmost)
}
pub fn hide_main(app: &AppHandle) -> Result<()> {
    let generation = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        s.manually_hidden = true;
        s.visibility_generation += 1;
        s.visibility_generation
    };
    let window = main_window(app)?;
    window.eval("document.documentElement.style.transition='opacity 180ms ease-out';document.documentElement.style.opacity='0';").map_err(|e|e.to_string())?;
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(180)).await;
        let should_hide = {
            let state = handle.state::<Desktop>();
            let s = state.inner.lock().unwrap();
            (s.manually_hidden || s.auto_hidden) && s.visibility_generation == generation
        };
        if should_hide {
            if let Err(error) = window.hide() {
                eprintln!("[Window] hide: {error}");
            }
        }
    });
    Ok(())
}
pub fn show_standalone(app: &AppHandle) -> Result<()> {
    let window = create(app, "standalone")?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}
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
pub fn restore_after_capture(app: &AppHandle) -> Result<()> {
    let state = app.state::<Desktop>();
    let hidden = {
        let mut s = state.inner.lock().unwrap();
        s.capture_payload = None;
        s.manually_hidden || s.auto_hidden
    };
    if !hidden {
        show_main(app)?;
    }
    Ok(())
}

pub fn effect(app: &AppHandle, label: &str, show: bool) -> Result<()> {
    if !matches!(label, "agent-voice-input" | "cli-glow") {
        return Err("Invalid effect".into());
    }
    if show {
        app.state::<Desktop>()
            .inner
            .lock()
            .unwrap()
            .closing_effects
            .remove(label);
        let window = create(app, label)?;
        window
            .eval("document.documentElement.style.transition='opacity 400ms ease-out';document.documentElement.style.opacity='1';")
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        raise_main(app)?;
    } else if let Some(window) = app.get_webview_window(label) {
        let generation = {
            let state = app.state::<Desktop>();
            let mut s = state.inner.lock().unwrap();
            s.effect_generation += 1;
            let generation = s.effect_generation;
            s.closing_effects.insert(label.into(), generation);
            generation
        };
        window
            .eval("document.documentElement.style.transition='opacity 400ms ease-out';document.documentElement.style.opacity='0';")
            .map_err(|e| e.to_string())?;
        let handle = app.clone();
        let label = label.to_owned();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(450)).await;
            let closing = {
                let state = handle.state::<Desktop>();
                let mut s = state.inner.lock().unwrap();
                if s.closing_effects.get(&label) == Some(&generation) {
                    s.closing_effects.remove(&label);
                    true
                } else {
                    false
                }
            };
            if closing {
                if let Err(e) = window.destroy() {
                    eprintln!("[Window] effect: {e}");
                }
            }
        });
    }
    if label == "agent-voice-input" {
        emit(app, "main", "agent-voice-input:state", json!([show]))?;
    }
    Ok(())
}

pub fn startup_complete(app: &AppHandle) -> Result<()> {
    let ready = {
        let state = app.state::<Desktop>();
        let s = state.inner.lock().unwrap();
        s.main_ready && s.splash_done
    };
    if !ready {
        return Ok(());
    }
    show_main(app)?;
    app.state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .manual_show_override = false;
    let guide = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value("first-launch", json!(true))
        != false;
    if guide {
        create(app, "guide")?;
    }
    Ok(())
}
pub fn close_splash(app: &AppHandle) -> Result<()> {
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if s.splash_done {
            return Ok(());
        }
        s.splash_done = true;
    }
    if let Some(window) = app.get_webview_window("splash") {
        window.destroy().map_err(|e| e.to_string())?;
    }
    startup_complete(app)
}
