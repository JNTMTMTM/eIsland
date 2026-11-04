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

use crate::geometry::{Point, Rect};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};

pub struct Desktop {
    pub inner: Mutex<Windows>,
    pub store: Mutex<Store>,
}

pub struct Windows {
    pub mode: String,
    pub shape: String,
    pub scale: f64,
    pub offset: Point,
    pub display: String,
    pub center: f64,
    pub visible: Rect,
    pub backing: Rect,
    pub transition: Option<u64>,
    pub pending: Option<Rect>,
    pub generation: u64,
    pub always_on_top: bool,
    pub manually_hidden: bool,
    pub manual_show_override: bool,
    pub auto_hidden: bool,
    pub visibility_generation: u64,
    pub passthrough_locked: bool,
    pub menu_anchor: Point,
    pub menu_ready: bool,
    pub menu_pending: bool,
    pub main_ready: bool,
    pub splash_done: bool,
    pub capture_payload: Option<Value>,
    pub capture_starting: bool,
    pub closing_effects: std::collections::HashMap<String, u64>,
    pub effect_generation: u64,
}

pub struct Store {
    pub directory: PathBuf,
}
impl Store {
    fn path(&self, key: &str) -> Result<PathBuf, String> {
        if key.is_empty()
            || key.len() > 180
            || !key
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
            || key.contains("..")
        {
            return Err("Invalid store key".into());
        }
        Ok(self.directory.join(format!("{key}.json")))
    }
    pub fn read(&self, key: &str) -> Result<Value, String> {
        let path = self.path(key)?;
        match std::fs::read(path) {
            Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Value::Null),
            Err(e) => Err(e.to_string()),
        }
    }
    pub fn write(&self, key: &str, value: &Value) -> Result<(), String> {
        let path = self.path(key)?;
        std::fs::create_dir_all(&self.directory).map_err(|e| e.to_string())?;
        std::fs::write(
            path,
            serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    }
    pub fn value(&self, key: &str, fallback: Value) -> Value {
        self.read(key)
            .ok()
            .filter(|v| !v.is_null())
            .unwrap_or(fallback)
    }
}
impl Desktop {
    pub fn new(directory: PathBuf) -> Self {
        let store = Store { directory };
        let shape = store
            .value("island-shape-mode", json!("notch"))
            .as_str()
            .unwrap_or("notch")
            .to_owned();
        let scale = normalize_scale(&store.value("island-scale", json!(100)));
        let offset =
            serde_json::from_value(store.value("island-position-offset", json!({"x":0,"y":0})))
                .unwrap_or_default();
        let display = store
            .value("island-display-id", json!("primary"))
            .as_str()
            .unwrap_or("primary")
            .to_owned();
        Self {
            store: Mutex::new(store),
            inner: Mutex::new(Windows {
                mode: "collapse".into(),
                shape,
                scale,
                offset,
                display,
                center: 0.,
                visible: Rect::default(),
                backing: Rect::default(),
                transition: None,
                pending: None,
                generation: 0,
                always_on_top: true,
                manually_hidden: false,
                manual_show_override: false,
                auto_hidden: false,
                visibility_generation: 0,
                passthrough_locked: false,
                menu_anchor: Point::default(),
                menu_ready: false,
                menu_pending: false,
                main_ready: false,
                splash_done: false,
                capture_payload: None,
                capture_starting: false,
                closing_effects: Default::default(),
                effect_generation: 0,
            }),
        }
    }
}

pub fn normalize_scale(value: &Value) -> f64 {
    value
        .as_f64()
        .filter(|n| n.is_finite())
        .unwrap_or(100.)
        .round()
        .clamp(50., 150.)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn store_rejects_traversal_and_reads_missing_as_null() {
        let store = Store {
            directory: std::env::temp_dir().join("eisland-store-contract-test"),
        };
        assert!(store.read("../secrets").is_err());
        assert!(store.read("C:\\secrets").is_err());
        assert_eq!(store.read("missing").unwrap(), Value::Null);
        assert_eq!(normalize_scale(&json!(999)), 150.);
    }
}
