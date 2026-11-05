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

//! 显示器选择、窗口几何计算与过渡完成状态。

use super::main_window;
use crate::infrastructure::platform::window as native;
use crate::shared::geometry;
use crate::shared::geometry::Rect;
use crate::shared::Result;
use crate::state::Desktop;
use tauri::AppHandle;
use tauri::Manager;
use tauri::WebviewWindow;

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
