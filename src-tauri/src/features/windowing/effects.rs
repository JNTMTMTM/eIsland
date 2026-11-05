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

//! 透明效果窗口的创建、淡出与按代次销毁。

use super::{create, emit, raise_main};
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::json;
use tauri::AppHandle;
use tauri::Manager;

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
