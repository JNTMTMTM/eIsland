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
    state::{Desktop, Store},
    windows::{self, Result},
};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

const KEY: &str = "autostart-mode";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Mode {
    Disabled,
    Enabled,
    HighPriority,
}
impl Mode {
    fn read(value: &Value) -> Self {
        match value.as_str() {
            Some("enabled") => Self::Enabled,
            Some("high-priority") => Self::HighPriority,
            _ => Self::Disabled,
        }
    }
    fn name(self) -> &'static str {
        match self {
            Self::Disabled => "disabled",
            Self::Enabled => "enabled",
            Self::HighPriority => "high-priority",
        }
    }
    fn arguments(self) -> &'static [&'static str] {
        if self == Self::HighPriority {
            &["--high-priority"]
        } else {
            &[]
        }
    }
}

/// Preserve the existing persisted three-state contract and mutate registration only when saving succeeds.
fn update(
    store: &Store,
    value: &Value,
    register: impl FnOnce(bool, &[&str]) -> Result<()>,
) -> Result<Mode> {
    let mode = Mode::read(value);
    store.write(KEY, &json!(mode.name()))?;
    register(mode != Mode::Disabled, mode.arguments())?;
    Ok(mode)
}

/// Build each login entry with its selected arguments, including removal of a previous high-priority flag.
fn register(app: &AppHandle, enabled: bool, args: &[&str]) -> Result<()> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let mut builder = auto_launch::AutoLaunchBuilder::new();
    builder
        .set_app_name(&app.package_info().name)
        .set_app_path(&executable.to_string_lossy())
        .set_args(args);
    #[cfg(windows)]
    builder.set_windows_enable_mode(auto_launch::WindowsEnableMode::CurrentUser);
    let entry = builder.build().map_err(|error| error.to_string())?;
    if enabled {
        entry.enable().map_err(|error| error.to_string())
    } else {
        match entry.disable() {
            Err(auto_launch::Error::Io(error)) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(())
            }
            result => result.map_err(|error| error.to_string()),
        }
    }
}

pub async fn handle(app: &AppHandle, channel: &str, value: &Value) -> Result<Value> {
    if channel.ends_with(":get") {
        let state = app.state::<Desktop>();
        let value = state.store.lock().unwrap().read(KEY).unwrap_or(Value::Null);
        return Ok(json!(Mode::read(&value).name()));
    }
    let app = app.clone();
    let value = value.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let result = {
            let state = app.state::<Desktop>();
            let store = state.store.lock().unwrap();
            update(&store, &value, |enabled, args| {
                register(&app, enabled, args)
            })
        };
        match result {
            Ok(mode) => {
                windows::broadcast(&app, "island:autostart", json!(mode.name()))?;
                Ok(json!(true))
            }
            Err(error) => {
                eprintln!("[Autostart] {error}");
                Ok(json!(false))
            }
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn store() -> Store {
        Store {
            directory: std::env::temp_dir()
                .join(format!("eisland-autostart-{}", uuid::Uuid::new_v4())),
        }
    }
    #[test]
    fn legacy_modes_and_invalid_data_keep_the_string_contract() {
        for name in ["disabled", "enabled", "high-priority"] {
            assert_eq!(Mode::read(&json!(name)).name(), name);
        }
        for invalid in [Value::Null, json!(true), json!("unknown"), json!(1)] {
            assert_eq!(Mode::read(&invalid), Mode::Disabled);
        }
    }
    #[test]
    fn switching_modes_persists_and_replaces_login_arguments() {
        let store = store();
        for (mode, enabled, args) in [
            ("high-priority", true, vec!["--high-priority"]),
            ("enabled", true, vec![]),
            ("disabled", false, vec![]),
        ] {
            update(&store, &json!(mode), |actual_enabled, actual_args| {
                assert_eq!(store.read(KEY)?, mode);
                assert_eq!(actual_enabled, enabled);
                assert_eq!(actual_args, args);
                Ok(())
            })
            .unwrap();
            assert_eq!(store.read(KEY).unwrap(), mode);
        }
        std::fs::remove_dir_all(store.directory).unwrap();
    }
    #[test]
    fn failed_persistence_does_not_touch_system_registration() {
        let store = store();
        std::fs::write(&store.directory, b"not a directory").unwrap();
        let mut called = false;
        assert!(update(&store, &json!("enabled"), |_, _| {
            called = true;
            Ok(())
        })
        .is_err());
        assert!(!called);
        std::fs::remove_file(store.directory).unwrap();
    }
    #[test]
    fn registration_failure_remains_an_error_and_keeps_legacy_persistence_order() {
        let store = store();
        assert!(update(&store, &json!("high-priority"), |_, _| Err(
            "fixture registry failure".into()
        ))
        .is_err());
        assert_eq!(store.read(KEY).unwrap(), "high-priority");
        std::fs::remove_dir_all(store.directory).unwrap();
    }
}
