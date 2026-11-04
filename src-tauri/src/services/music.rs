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

#[path = "music_audio.rs"]
mod audio;
#[path = "music_auth.rs"]
mod auth;
#[path = "music_business.rs"]
mod business;
#[path = "music_network.rs"]
pub(crate) mod network;

use super::music_window::AuthWindow;
use crate::{state::Desktop, windows::Result};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::watch;

pub struct Music {
    pub window: AuthWindow,
    pub shutdown: watch::Sender<bool>,
    pub(crate) client: reqwest::Client,
    server: Mutex<Option<Arc<audio::LocalServer>>>,
    auth: tokio::sync::Mutex<auth::AuthState>,
}

pub fn handles(channel: &str) -> bool {
    channel == "net:fetch"
        || channel.starts_with("qishui:")
        || channel.starts_with("music-provider-auth:")
        || setting(channel).is_some()
}

fn setting(channel: &str) -> Option<(&str, Value)> {
    let base = channel
        .strip_suffix(":get")
        .or_else(|| channel.strip_suffix(":set"))?;
    Some(match base {
        "music:lyrics-source" => ("lyrics-source", json!("auto")),
        "music:provider-mode" => ("music-provider-mode", json!("guest")),
        "music:lyrics-enabled" => ("lyrics-enabled", json!(true)),
        "music:lyrics-translation-enabled" => ("lyrics-translation-enabled", json!(true)),
        "music:lyrics-karaoke" => ("lyrics-karaoke", json!(false)),
        "music:lyrics-clock" => ("lyrics-clock", json!(true)),
        "music:lyrics-calibrate-enabled" => ("lyrics-calibrate-enabled", json!(true)),
        "music:lyrics-calibrate-delay" => ("lyrics-calibrate-delay", json!(20)),
        "music:smtc-unsubscribe-ms" => ("music-smtc-unsubscribe-ms", json!(0)),
        _ => return None,
    })
}

fn normalize(key: &str, value: &Value, fallback: Value) -> Value {
    match key {
        "music-provider-mode" => json!(if value == "logged-in" {
            "logged-in"
        } else {
            "guest"
        }),
        "lyrics-calibrate-delay" => json!(value
            .as_f64()
            .filter(|v| v.is_finite() && *v >= 0.)
            .unwrap_or(20.)
            .floor()),
        "music-smtc-unsubscribe-ms" => {
            let value = value
                .as_f64()
                .filter(|v| v.is_finite())
                .unwrap_or(0.)
                .round();
            json!(if value <= 0. {
                0.
            } else {
                value.clamp(1000., 1800000.)
            })
        }
        "lyrics-source" => value.as_str().map_or(fallback, |value| json!(value)),
        _ => value.as_bool().map_or(fallback, |value| json!(value)),
    }
}

impl Music {
    pub fn new() -> Self {
        let (shutdown, _) = watch::channel(false);
        Self {
            window: AuthWindow::new(),
            shutdown,
            client: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::limited(10))
                .build()
                .expect("HTTP client initialization failed"),
            server: Mutex::new(None),
            auth: tokio::sync::Mutex::new(auth::AuthState::default()),
        }
    }

    pub(crate) fn server(&self, app: &AppHandle) -> Result<Arc<audio::LocalServer>> {
        let mut current = self.server.lock().unwrap();
        if let Some(server) = current.as_ref() {
            return Ok(server.clone());
        }
        let server = audio::LocalServer::start(app, self.shutdown.subscribe())?;
        *current = Some(server.clone());
        Ok(server)
    }

    pub async fn request(&self, app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
        if channel == "net:fetch" {
            return Ok(network::fetch(&self.client, args).await);
        }
        if let Some((key, fallback)) = setting(channel) {
            if channel.ends_with(":get") {
                let value = app
                    .state::<Desktop>()
                    .store
                    .lock()
                    .unwrap()
                    .value(key, fallback.clone());
                return Ok(normalize(key, &value, fallback));
            }
            let value = normalize(key, args.first().unwrap_or(&Value::Null), fallback);
            app.state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .write(key, &value)?;
            if key == "music-smtc-unsubscribe-ms" {
                app.state::<super::Services>()
                    .media
                    .set_unsubscribe_ms(value.as_f64().unwrap_or(0.) as u64);
            }
            if matches!(
                key,
                "lyrics-karaoke"
                    | "lyrics-calibrate-enabled"
                    | "lyrics-calibrate-delay"
                    | "music-smtc-unsubscribe-ms"
            ) {
                app.emit("eisland-ipc",json!({"channel":"settings:changed","args":[channel.trim_end_matches(":set"),value]})).map_err(|e|e.to_string())?;
            }
            return Ok(json!(true));
        }
        if channel.starts_with("music-provider-auth:") {
            return self.authentication(app, channel, args).await;
        }
        business::handle(self, app, channel, args).await
    }
}

pub(crate) fn data_directory(app: &AppHandle) -> std::path::PathBuf {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .directory
        .parent()
        .unwrap()
        .to_path_buf()
}
pub(crate) fn text(value: &Value) -> String {
    match value {
        Value::String(v) => v.trim().to_owned(),
        Value::Number(v) => v.to_string(),
        Value::Bool(v) => v.to_string(),
        _ => String::new(),
    }
}
pub(crate) fn required(value: Option<&Value>, message: &str) -> Result<String> {
    let value = value.map(text).unwrap_or_default();
    if value.is_empty() {
        Err(message.to_owned())
    } else {
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preferences_keep_previous_defaults_and_bounds() {
        assert_eq!(
            normalize("music-provider-mode", &json!("bad"), Value::Null),
            "guest"
        );
        assert_eq!(
            normalize("music-smtc-unsubscribe-ms", &json!(0.1), Value::Null),
            0.
        );
        assert_eq!(
            normalize("music-smtc-unsubscribe-ms", &json!(1), Value::Null),
            1000.
        );
        assert_eq!(setting("music:lyrics-karaoke:get").unwrap().1, false);
        assert!(setting("music:unknown:get").is_none());
    }
}
