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

//! 原生 WebView 窗口创建、安全导航约束与窗口事件绑定。

use super::{hide_menu, main_window, reposition, restore_after_capture, target_monitor};
use crate::shared::Result;
use crate::state::Desktop;
use tauri::AppHandle;
use tauri::Manager;
use tauri::WebviewUrl;
use tauri::WebviewWindow;
use tauri::WebviewWindowBuilder;
use tauri_plugin_opener::OpenerExt;

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
    #[cfg(debug_assertions)]
    eprintln!("[WebView] creating {label}");
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
        // Windows shadows add a native 1px frame and system corners over the
        // transparent splash's CSS-rounded surface.
        .shadow(label == "splash" && !cfg!(windows))
        .resizable(label == "standalone")
        .skip_taskbar(label != "standalone" && label != "guide")
        .always_on_top(label != "standalone" && label != "guide")
        // WebView2 must initialize its render HWND before Wry registers file-drop targets.
        // Hidden, unfocused views can otherwise miss Explorer drops (wry#1638).
        .focused(cfg!(windows) && matches!(label, "main" | "standalone"))
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
    #[cfg(debug_assertions)]
    eprintln!("[WebView] created {label}");
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
            crate::features::agent::cancel_window(&kind);
            crate::features::runtime::cancel_window(&handle, &kind);
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
