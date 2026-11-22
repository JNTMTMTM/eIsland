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
use crate::shared::geometry::{Point, Rect};
use crate::shared::Result;
use crate::state::{Desktop, ShapeMotion};
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tauri::Manager;
use tauri::PhysicalPosition;
use tauri::WebviewWindow;

/// 几何操作统一在窗口线程提交，避免位置帧与状态 resize 交错。
pub fn on_main_thread<T: Send + 'static>(
    app: &AppHandle,
    operation: impl FnOnce(&AppHandle) -> Result<T> + Send + 'static,
) -> Result<T> {
    let handle = app.clone();
    let (send, receive) = std::sync::mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let _ = send.send(operation(&handle));
    })
    .map_err(|e| e.to_string())?;
    receive.recv().map_err(|e| e.to_string())?
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

fn apply_geometry(app: &AppHandle, target: Rect, visible: Rect) -> Result<()> {
    let window = main_window(app)?;
    let previous = app.state::<Desktop>().inner.lock().unwrap().backing;
    let backing = Rect {
        height: visible.height,
        ..geometry::backing_rect(target, previous.width)
    };
    window
        .set_size(tauri::LogicalSize::new(backing.width, backing.height))
        .map_err(|e| e.to_string())?;
    if previous.width == 0. || backing.x != previous.x || backing.y != previous.y {
        window
            .set_position(tauri::LogicalPosition::new(backing.x, backing.y))
            .map_err(|e| e.to_string())?;
    }
    native::clip(&window, backing, visible)?;
    let state = app.state::<Desktop>();
    let mut state = state.inner.lock().unwrap();
    state.backing = backing;
    state.visible = Rect::centered(
        backing.x + backing.width / 2.,
        backing.y,
        visible.width,
        visible.height,
    );
    Ok(())
}

pub fn reposition(app: &AppHandle) -> Result<()> {
    on_main_thread(app, reposition_now)
}

fn reposition_now(app: &AppHandle) -> Result<()> {
    let area = monitor_rect(&target_monitor(app)?);
    let target = {
        let state = app.state::<Desktop>();
        let mut state = state.inner.lock().unwrap();
        state.center = area.x + area.width / 2. + state.offset.x;
        let (width, height) = geometry::state_size(&state.mode, state.scale).unwrap();
        let y = area.y
            + if state.shape == "pill" {
                46. + state.offset.y
            } else {
                0.
            };
        state.generation += 1;
        state.pending = None;
        state.transition = None;
        state.shape_motion = None;
        Rect::centered(state.center, y, width, height)
    };
    apply_geometry(app, target, target)
}

/// 记录系统拖动和动画的实际位置，并让等待收缩的画布跟随当前位置。
pub(super) fn record_moved(app: &AppHandle, position: PhysicalPosition<i32>, scale: f64) {
    let state = app.state::<Desktop>();
    let mut s = state.inner.lock().unwrap();
    s.backing.x = f64::from(position.x) / scale;
    s.backing.y = f64::from(position.y) / scale;
    let center = s.backing.x + s.backing.width / 2.;
    let y = s.backing.y;
    s.visible.x = center - s.visible.width / 2.;
    s.visible.y = y;
    if s.shape == "pill" || s.shape_motion.is_some() {
        if let Some(pending) = &mut s.pending {
            pending.x = center - pending.width / 2.;
            pending.y = y;
        }
    }
}

pub(super) fn reclip(app: &AppHandle, window: &WebviewWindow, factor: f64) -> Result<()> {
    let (backing, visible) = {
        let state = app.state::<Desktop>();
        let s = state.inner.lock().unwrap();
        (s.backing, s.visible)
    };
    native::clip_at_scale(window, backing, visible, factor)
}

/// 从实际窗口位置开始归位，窗口移动与 WebView 的绘制时机独立。
pub(super) fn prepare_shape(app: &AppHandle, mode: &str) -> Result<(u64, Rect)> {
    let window = main_window(app)?;
    native::cancel_dragging(&window);
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let factor = window.scale_factor().map_err(|e| e.to_string())?;
    let monitor = target_monitor(app)?;
    let area = monitor_rect(&monitor);
    record_moved(app, position, factor);
    let (motion, target, visible, protected) = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        let pill = mode == "pill";
        let (width, height) = geometry::state_size(&s.mode, s.scale).unwrap();
        s.shape = mode.into();
        s.center = area.x + area.width / 2. + s.offset.x;
        let y = area.y + if pill { 46. + s.offset.y } else { 0. };
        let target = Rect::centered(s.center, y, width, height);
        s.shape_revision += 1;
        let motion = ShapeMotion {
            id: s.shape_revision,
            position: Some((
                Point {
                    x: f64::from(position.x) + f64::from(size.width) / 2.,
                    y: f64::from(position.y),
                },
                Point {
                    x: s.center * monitor.scale_factor(),
                    y: y * monitor.scale_factor(),
                },
            )),
        };
        s.shape_motion = Some(motion);
        let protected = Rect::centered(
            s.backing.x + s.backing.width / 2.,
            s.backing.y,
            s.visible.width.max(width),
            s.visible.height.max(height),
        );
        if let Some(pending) = &mut s.pending {
            *pending = Rect::centered(
                protected.x + protected.width / 2.,
                protected.y,
                width,
                height,
            );
        }
        (motion, target, s.visible, protected)
    };
    if visible.width != protected.width || visible.height != protected.height {
        apply_geometry(app, protected, protected)?;
    }
    let state = app.state::<Desktop>();
    let store = state.store.lock().unwrap();
    let spring = store.value("spring-animation", serde_json::json!(true)) == true;
    let speed = store.value("animation-speed", serde_json::json!("medium"));
    // 对应 shell.css 中 clip-path 的六档过渡时长。
    let duration_ms = match (speed.as_str(), spring) {
        (Some("fast"), true) => 340,
        (Some("slow"), true) => 1080,
        (_, true) => 680,
        (Some("fast"), false) => 200,
        (Some("slow"), false) => 640,
        (_, false) => 400,
    };
    let handle = app.clone();
    let started = Instant::now();
    tauri::async_runtime::spawn(async move {
        let mut frames = tokio::time::interval(Duration::from_millis(16));
        frames.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            frames.tick().await;
            match on_main_thread(&handle, move |app| {
                let elapsed = started.elapsed().as_secs_f64() * 1000. / duration_ms as f64;
                advance_shape(app, motion.id, shape_easing(elapsed, spring))
            }) {
                Ok(true) => {}
                Ok(false) => break,
                Err(error) => {
                    eprintln!("[Window] shape transition: {error}");
                    break;
                }
            }
        }
    });
    Ok((motion.id, target))
}

/// 在 CSS 贝塞尔曲线上按经过时间取样，让原生位移与轮廓使用相同的缓动。
fn shape_easing(elapsed: f64, spring: bool) -> f64 {
    if elapsed >= 1. || elapsed <= 0. {
        return elapsed.clamp(0., 1.);
    }
    let (x1, y1, x2) = if spring {
        (0.22, 1., 0.36)
    } else {
        (0.25, 0.1, 0.25)
    };
    let bezier = |t: f64, p1: f64, p2: f64| {
        let u = 1. - t;
        3. * u * u * t * p1 + 3. * u * t * t * p2 + t * t * t
    };
    let (mut low, mut high) = (0., 1.);
    for _ in 0..16 {
        let t = (low + high) / 2.;
        if bezier(t, x1, x2) < elapsed {
            low = t;
        } else {
            high = t;
        }
    }
    bezier((low + high) / 2., y1, 1.)
}

/// 返回是否继续本次动画；快速反向切换时旧帧不能覆盖新位置。
fn advance_shape(app: &AppHandle, id: u64, progress: f64) -> Result<bool> {
    let state = app.state::<Desktop>();
    let Some(motion) = state
        .inner
        .lock()
        .unwrap()
        .shape_motion
        .filter(|motion| motion.id == id)
    else {
        return Ok(false);
    };
    if let Some((from, to)) = motion.position {
        let window = main_window(app)?;
        let width = f64::from(window.outer_size().map_err(|e| e.to_string())?.width);
        let x = from.x + (to.x - from.x) * progress - width / 2.;
        let y = from.y + (to.y - from.y) * progress;
        let position = PhysicalPosition::new(x.round() as i32, y.round() as i32);
        move_to(app, &window, position)?;
    }
    if progress >= 1. {
        finish_shape(app)?;
    }
    Ok(progress < 1.)
}

fn move_to(app: &AppHandle, window: &WebviewWindow, position: PhysicalPosition<i32>) -> Result<()> {
    if window.outer_position().map_err(|e| e.to_string())? != position {
        window.set_position(position).map_err(|e| e.to_string())?;
        let actual = window.outer_position().map_err(|e| e.to_string())?;
        record_moved(
            app,
            actual,
            window.scale_factor().map_err(|e| e.to_string())?,
        );
    }
    Ok(())
}

pub fn move_delta(app: &AppHandle, dx: f64, dy: f64) -> Result<()> {
    on_main_thread(app, move |app| {
        let window = main_window(app)?;
        move_by(app, &window, dx, dy)
    })
}

fn move_by(app: &AppHandle, window: &WebviewWindow, dx: f64, dy: f64) -> Result<()> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let factor = window.scale_factor().map_err(|e| e.to_string())?;
    move_to(
        app,
        window,
        PhysicalPosition::new(
            position.x + (dx * factor).round() as i32,
            position.y + (dy * factor).round() as i32,
        ),
    )
}

fn finish_shape(app: &AppHandle) -> Result<()> {
    let target = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        s.shape_motion = None;
        if s.pending.is_some() {
            return Ok(());
        }
        let (width, height) = geometry::state_size(&s.mode, s.scale).unwrap();
        if s.visible.width == width && s.visible.height == height {
            return Ok(());
        }
        Rect {
            x: s.backing.x + (s.backing.width - width) / 2.,
            y: s.backing.y,
            width,
            height,
        }
    };
    apply_geometry(app, target, target)
}

pub fn start_pill_drag(app: &AppHandle, dx: f64, dy: f64) -> Result<()> {
    on_main_thread(app, move |app| {
        let state = app.state::<Desktop>();
        {
            let s = state.inner.lock().unwrap();
            if s.shape != "pill"
                || !matches!(
                    s.mode.as_str(),
                    "collapse" | "expand-lyrics" | "expand-lyrics-translation"
                )
            {
                return Ok(());
            }
        }
        if state
            .store
            .lock()
            .unwrap()
            .value("island-position-locked", serde_json::json!(false))
            == true
        {
            return Ok(());
        }
        if let Some(motion) = &mut state.inner.lock().unwrap().shape_motion {
            // 用户接管位置，形态动画继续保留画布直到轮廓完成。
            motion.position = None;
        }
        let window = main_window(app)?;
        // 系统从接管时的指针位置开始拖动，先补上越过阈值的位移，保住按下时的抓取点。
        move_by(app, &window, dx, dy)?;
        native::start_dragging(&window)
    })
}

/// Grow immediately; defer shrinking until the exact renderer transition completes.
pub fn resize(app: &AppHandle, mode: &str, delay_ms: u64) -> Result<()> {
    let mode = mode.to_owned();
    on_main_thread(app, move |app| resize_now(app, &mode, delay_ms))
}

fn resize_now(app: &AppHandle, mode: &str, delay_ms: u64) -> Result<()> {
    let area = monitor_rect(&target_monitor(app)?);
    let (target, protected, generation, wait, pending, moving) = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        let (width, height) = geometry::state_size(mode, s.scale).ok_or("Invalid island state")?;
        s.mode = mode.into();
        let moving = s.shape_motion.is_some();
        let center = if s.shape == "pill" || moving {
            s.backing.x + s.backing.width / 2.
        } else {
            s.center
        };
        let y = if s.shape == "pill" || moving {
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
            shrinking,
            moving,
        )
    };
    if !pending && !moving {
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
    if pending {
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(wait)).await;
            if let Err(error) = finish_resize(&handle, generation) {
                eprintln!("[Window] resize: {error}");
            }
        });
    }
    Ok(())
}

pub fn finish_resize(app: &AppHandle, generation: u64) -> Result<()> {
    on_main_thread(app, move |app| finish_resize_now(app, generation))
}

fn finish_resize_now(app: &AppHandle, generation: u64) -> Result<()> {
    let target = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if s.generation != generation {
            return Ok(());
        }
        s.transition = None;
        let pending = s.pending.take();
        if s.shape_motion.is_some() {
            None
        } else {
            pending
        }
    };
    if let Some(target) = target {
        apply_geometry(app, target, target)?;
    }
    Ok(())
}
