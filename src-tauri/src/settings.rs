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
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

/// Return only window/UI settings that already exist in the Electron contract.
pub fn definition(channel: &str) -> Option<(&'static str, Value)> {
    Some(match channel {
        "theme:mode" => ("theme-mode", json!("dark")),
        "island:opacity" => ("island-opacity", json!(100)),
        "island:expand-mouseleave-idle" => ("expand-mouseleave-idle", json!(false)),
        "island:maxexpand-mouseleave-idle" => ("maxexpand-mouseleave-idle", json!(false)),
        "island:idle-click-expand" => ("idle-click-expand", json!(false)),
        "island:spring-animation" => ("spring-animation", json!(true)),
        "island:animation-speed" => ("animation-speed", json!("medium")),
        "island:nav-order" => ("nav-order", json!({"visibleOrder":[],"hiddenOrder":[]})),
        _ => return None,
    })
}
pub fn validate(channel: &str, value: &Value) -> Result<Value> {
    match channel {
        "theme:mode" if matches!(value.as_str(), Some("dark" | "light" | "system")) => {
            Ok(value.clone())
        }
        "island:animation-speed" if matches!(value.as_str(), Some("slow" | "medium" | "fast")) => {
            Ok(value.clone())
        }
        "island:opacity" => value
            .as_f64()
            .filter(|v| v.is_finite())
            .map(|v| json!(v.round().clamp(10., 100.)))
            .ok_or("Invalid opacity".into()),
        "island:nav-order" if value.is_object() => Ok(value.clone()),
        _ if value.is_boolean()
            && matches!(
                channel,
                "island:expand-mouseleave-idle"
                    | "island:maxexpand-mouseleave-idle"
                    | "island:idle-click-expand"
                    | "island:spring-animation"
            ) =>
        {
            Ok(value.clone())
        }
        _ => Err("Invalid window setting".into()),
    }
}
pub fn handle(app: &AppHandle, channel: &str, value: &Value) -> Result<Option<Value>> {
    let Some((base, operation)) = channel.rsplit_once(':') else {
        return Ok(None);
    };
    let Some((key, fallback)) = definition(base) else {
        return Ok(None);
    };
    match operation {
        "get" => {
            let current = app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value(key, fallback.clone());
            Ok(Some(validate(base, &current).unwrap_or(fallback)))
        }
        "set" => {
            let value = validate(base, value)?;
            app.state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .write(key, &value)?;
            windows::broadcast(app, base, value)?;
            Ok(Some(json!(true)))
        }
        _ => Ok(None),
    }
}
