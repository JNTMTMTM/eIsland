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

//! 窗口可见性、叠放层级与启动显示状态。

use super::{create, emit, main_window, reposition};
use crate::infrastructure::platform::window as native;
use crate::shared::Result;
use crate::state::{Desktop, WindowState};
use serde_json::json;
use tauri::AppHandle;
use tauri::Manager;

pub fn show_main(app: &AppHandle) -> Result<()> {
    let existed = app.get_webview_window("main").is_some();
    let window = create(app, "main")?;
    clear_hidden(&mut app.state::<Desktop>().inner.lock().unwrap());
    if app.get_webview_window("capture").is_some()
        || app.state::<Desktop>().inner.lock().unwrap().capture_active
    {
        return Ok(());
    }
    present_main(app, &window, existed)
}

/// 清除隐藏标记并使延迟中的隐藏任务失效。调用方需持有状态锁。
fn clear_hidden(s: &mut WindowState) {
    s.manually_hidden = false;
    s.auto_hidden = false;
    s.manual_show_override = true;
    s.visibility_generation += 1;
}

fn present_main(app: &AppHandle, window: &tauri::WebviewWindow, existed: bool) -> Result<()> {
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

pub fn restore_after_capture(app: &AppHandle) -> Result<()> {
    let state = app.state::<Desktop>();
    // 判断与清除隐藏标记在同一把锁内完成，避免并发的隐藏请求被覆盖。
    let (show, restart) = {
        let mut s = state.inner.lock().unwrap();
        s.capture_payload = None;
        s.capture_pixels = None;
        s.capture_renderer_ready = false;
        s.capture_closing = false;
        let restart = std::mem::take(&mut s.capture_restart);
        let show = !restart && !(s.manually_hidden || s.auto_hidden);
        if show {
            clear_hidden(&mut s);
        }
        (show, restart)
    };
    let result = if show {
        let existed = app.get_webview_window("main").is_some();
        create(app, "main").and_then(|window| present_main(app, &window, existed))
    } else {
        Ok(())
    };
    state.inner.lock().unwrap().capture_active = false;
    if restart {
        // 旧选区窗口销毁期间收到的截图请求，在状态释放后重新执行，主窗口保持隐藏。
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = crate::features::capture::start(&app).await {
                eprintln!("[Capture] restart: {error}");
            }
        });
    }
    result
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
