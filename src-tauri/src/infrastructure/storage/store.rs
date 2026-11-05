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

use serde_json::Value;
use std::path::PathBuf;

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
