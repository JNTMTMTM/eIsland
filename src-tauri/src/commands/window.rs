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

//! 窗口生命周期、几何过渡与显示操作命令。

use super::input::{cursor, number, source};
use crate::features::capture;
use crate::features::windowing as windows;
use crate::shared::geometry::Rect;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::{json, Value};
use tauri::Manager;
use tauri::{AppHandle, WebviewWindow};

pub(super) fn handles(channel: &str) -> bool {
    channel
        .strip_prefix("window:")
        .is_some_and(|mode| crate::shared::geometry::state_size(mode, false, 100.).is_some())
        || matches!(
            channel,
            "window:renderer-ready"
                | "window:transition:begin"
                | "window:transition:complete"
                | "window:enable-mouse-passthrough"
                | "window:disable-mouse-passthrough"
                | "window:get-bounds"
                | "window:get-mouse-position"
                | "window:get-mouse-window-state"
                | "window:move-delta"
                | "window:hide"
                | "window:show"
                | "window:start-dragging"
                | "window:minimize"
                | "window:maximize"
                | "window:close"
                | "window:island-displays:list"
                | "app:open-standalone-window"
                | "app:close-standalone-window"
                | "cli-glow:show"
                | "cli-glow:hide"
                | "agent-voice-input:show"
                | "agent-voice-input:hide"
        )
}

pub(super) fn handle(
    app: AppHandle,
    window: WebviewWindow,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    let b = args.get(1).unwrap_or(&Value::Null);
    if let Some(mode) = channel.strip_prefix("window:") {
        if crate::shared::geometry::state_size(mode, false, 100.).is_some() {
            source(&window, "main")?;
            windows::resize(&app, mode, a.as_u64().unwrap_or(0).min(30000))?;
            return Ok(Value::Null);
        }
    }
    match channel.as_str() {
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
        "cli-glow:show" | "cli-glow:hide" => {
            windows::effect(&app, "cli-glow", channel.ends_with(":show"))?;
            return Ok(json!(true));
        }
        "agent-voice-input:show" | "agent-voice-input:hide" => {
            windows::effect(&app, "agent-voice-input", channel.ends_with(":show"))?;
            return Ok(json!(true));
        }
        _ => return Err(format!("Unknown native desktop operation: {channel}")),
    }
    Ok(Value::Null)
}
