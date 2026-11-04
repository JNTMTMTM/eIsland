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
    state::Desktop,
    windows::{self, Result},
};
use serde_json::json;
use tauri::{AppHandle, Manager};

fn normalize(name: &str) -> String {
    name.trim()
        .to_lowercase()
        .trim_end_matches(".exe")
        .to_owned()
}

fn should_hide(app: &AppHandle) -> Result<bool> {
    let (fullscreen, names) = {
        let state = app.state::<Desktop>();
        let store = state.store.lock().unwrap();
        (
            store.value("auto-hide-fullscreen-windows", json!(false)) == true,
            store
                .value("hide-process-list", json!([]))
                .as_array()
                .map(|v| {
                    v.iter()
                        .filter_map(|v| v.as_str())
                        .map(normalize)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default(),
        )
    };
    if !fullscreen && names.is_empty() {
        return Ok(false);
    }
    let candidates = xcap::Window::all().map_err(|e| e.to_string())?;
    for window in candidates {
        if window.pid().ok() == Some(std::process::id()) || window.is_minimized().unwrap_or(true) {
            continue;
        }
        if window.is_focused().unwrap_or(false)
            && window
                .app_name()
                .ok()
                .is_some_and(|name| names.contains(&normalize(&name)))
        {
            return Ok(true);
        }
        if fullscreen {
            let Ok(monitor) = window.current_monitor() else {
                continue;
            };
            let title = window.title().unwrap_or_default();
            if title.is_empty()
                || matches!(
                    title.as_str(),
                    "Program Manager" | "Windows Input Experience"
                )
            {
                continue;
            }
            if window.x().ok() == monitor.x().ok()
                && window.y().ok() == monitor.y().ok()
                && window.width().ok() == monitor.width().ok()
                && window.height().ok() == monitor.height().ok()
            {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

pub fn check(app: &AppHandle) -> Result<()> {
    if app.get_webview_window("main").is_none()
        || app.get_webview_window("capture").is_some()
        || app
            .state::<Desktop>()
            .inner
            .lock()
            .unwrap()
            .capture_starting
    {
        return Ok(());
    }
    let revision = app
        .state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .visibility_generation;
    let hide = should_hide(app)?;
    let action = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if revision != s.visibility_generation
            || !s.main_ready
            || !s.splash_done
            || s.manually_hidden
        {
            return Ok(());
        }
        if s.manual_show_override {
            if !hide {
                s.manual_show_override = false;
            }
            return Ok(());
        }
        if hide == s.auto_hidden {
            return Ok(());
        }
        s.auto_hidden = hide;
        hide
    };
    if action {
        windows::hide_main(app)?;
        app.state::<Desktop>().inner.lock().unwrap().manually_hidden = false;
    } else {
        windows::show_main(app)?;
        app.state::<Desktop>()
            .inner
            .lock()
            .unwrap()
            .manual_show_override = false;
    }
    Ok(())
}

pub fn start(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut topology = String::new();
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(2500)).await;
            let next = handle
                .available_monitors()
                .map(|monitors| format!("{monitors:?}"));
            if let Ok(next) = next {
                if !topology.is_empty()
                    && topology != next
                    && handle.get_webview_window("main").is_some()
                {
                    if let Err(error) = windows::reposition(&handle) {
                        eprintln!("[Display] {error}");
                    }
                }
                topology = next;
            }
            if let Err(error) = check(&handle) {
                eprintln!("[AutoHide] {error}");
            }
        }
    });
}
