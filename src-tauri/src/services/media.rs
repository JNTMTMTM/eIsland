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

use super::{media_state::Sessions, Services};
use crate::{
    state::Desktop,
    windows::{self, Result},
};
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, Manager};

pub struct Media {
    sessions: Mutex<Sessions>,
    #[cfg(windows)]
    api: Mutex<Option<Arc<super::smtc::Api>>>,
    #[cfg(windows)]
    command_gate: Mutex<()>,
    #[cfg(windows)]
    command_slots: Arc<tokio::sync::Semaphore>,
}
impl Media {
    #[cfg(debug_assertions)]
    pub fn diagnostics(&self) -> Value {
        #[cfg(windows)]
        let ready = self.api.lock().unwrap().is_some();
        #[cfg(not(windows))]
        let ready = false;
        let sessions = self.sessions.lock().unwrap();
        json!({"ready":ready,"error":sessions.error,"sessionCount":sessions.entries.len()})
    }
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(Sessions::new(Vec::new())),
            #[cfg(windows)]
            api: Mutex::new(None),
            #[cfg(windows)]
            command_gate: Mutex::new(()),
            #[cfg(windows)]
            command_slots: Arc::new(tokio::sync::Semaphore::new(16)),
        }
    }
    fn update(&self, app: &AppHandle, changes: &[Value], full: bool) -> Result<()> {
        let (outbound, pending_before, pending_after) = {
            let mut sessions = self.sessions.lock().unwrap();
            let before = sessions.summary();
            let pending_before = sessions.pending.clone();
            sessions.apply(changes, full);
            let after = sessions.summary();
            let media_changed = full
                || changes.iter().any(|c| {
                    c["sourceAppId"] == sessions.current
                        && (c["mediaChanged"] == true || c["artworkChanged"] == true)
                });
            let source_changed = before["deviceId"] != after["deviceId"];
            let resumed = before["isPlaying"] != true && after["isPlaying"] == true;
            let outbound = if before != after || media_changed {
                Some(if media_changed || source_changed || resumed {
                    sessions.payload()
                } else {
                    after
                })
            } else {
                None
            };
            (outbound, pending_before, sessions.pending.clone())
        };
        // Timeline-only updates neither clone the base64 string nor transmit it.
        if let Some(outbound) = outbound {
            publish(app, outbound)?;
        }
        if !pending_after.is_empty() && pending_after != pending_before {
            let request = {
                let sessions = self.sessions.lock().unwrap();
                let entry = &sessions.entries[&pending_after];
                json!({"sourceAppId":pending_after,"title":entry["media"]["title"],"artist":entry["media"]["artist"]})
            };
            windows::emit(app, "main", "media:source-switch-request", json!([request]))?;
        }
        Ok(())
    }
    pub fn start(self: &Arc<Self>, app: &AppHandle, stopped: Arc<AtomicBool>) {
        self.sessions.lock().unwrap().whitelist = whitelist(app);
        #[cfg(windows)]
        {
            let media = self.clone();
            let app = app.clone();
            let spawn = std::thread::Builder::new()
                .name("smtc-monitor".into())
                .spawn(move || {
                    let result = (|| -> Result<()> {
                        let path = super::native_path(&app, "smtc", "eIslandSmtcHelper.dll")?;
                        let api = Arc::new(super::smtc::Api::load(&path)?);
                        api.start()?;
                        *media.api.lock().unwrap() = Some(api.clone());
                        let result = (|| -> Result<()> {
                            media.update(&app, &api.snapshot(true)?, true)?;
                            while !stopped.load(Ordering::Acquire) {
                                match api.wait() {
                                    0 => {
                                        let changes = api.snapshot(false)?;
                                        if !changes.is_empty() {
                                            media.update(&app, &changes, false)?;
                                        }
                                    }
                                    1 => {}
                                    _ => return Err("SMTC change wait failed".into()),
                                }
                            }
                            Ok(())
                        })();
                        api.stop();
                        *media.api.lock().unwrap() = None;
                        result
                    })();
                    if let Err(error) = result {
                        {
                            let mut sessions = media.sessions.lock().unwrap();
                            sessions.error = Some(error.clone());
                            sessions.entries.clear();
                            sessions.current.clear();
                            sessions.pending.clear();
                        }
                        let _ = publish(&app, Value::Null);
                        eprintln!("[SMTC] {error}");
                    }
                });
            if let Err(error) = spawn {
                self.sessions.lock().unwrap().error = Some(error.to_string());
            }
        }
        #[cfg(not(windows))]
        {
            let _ = stopped;
            self.sessions.lock().unwrap().error = Some("SMTC is supported only on Windows".into());
        }
    }
    #[cfg(windows)]
    async fn command(self: &Arc<Self>, name: &str, argument: Option<f64>) -> Value {
        let (source, name) = {
            let s = self.sessions.lock().unwrap();
            if s.current.is_empty() {
                return json!({"success":false,"error":s.error.as_deref().unwrap_or("No matching media session")});
            }
            let name = if name == "play-pause" {
                if s.entries
                    .get(&s.current)
                    .is_some_and(super::media_state::playing)
                {
                    "pause"
                } else {
                    "play"
                }
            } else {
                name
            };
            (s.current.clone(), name.to_owned())
        };
        let Some(api) = self.api.lock().unwrap().clone() else {
            return json!({"success":false,"error":"SMTC is not ready"});
        };
        let Ok(slot) = self.command_slots.clone().try_acquire_owned() else {
            return json!({"success":false,"error":"SMTC command queue is full"});
        };
        let media = self.clone();
        let requested_at = std::time::Instant::now();
        let operation = tauri::async_runtime::spawn_blocking(move || -> Result<()> {
            let _slot = slot;
            let _guard = media.command_gate.lock().unwrap();
            if requested_at.elapsed() >= std::time::Duration::from_secs(4) {
                return Err("SMTC command expired".into());
            }
            if media.sessions.lock().unwrap().current != source {
                return Err("Media source changed".into());
            }
            api.command(&source, &name, argument)
        });
        match tokio::time::timeout(std::time::Duration::from_secs(4), operation).await {
            Ok(Ok(Ok(()))) => json!({"success":true,"error":null}),
            Ok(Ok(Err(error))) => json!({"success":false,"error":error}),
            Ok(Err(error)) => json!({"success":false,"error":error.to_string()}),
            Err(_) => json!({"success":false,"error":"SMTC command timed out"}),
        }
    }
    #[cfg(not(windows))]
    async fn command(self: &Arc<Self>, _name: &str, _argument: Option<f64>) -> Value {
        json!({"success":false,"error":"SMTC is supported only on Windows"})
    }
}

fn whitelist(app: &AppHandle) -> Vec<String> {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value(
            "music-whitelist",
            json!(["QQMusic.exe", "cloudmusic.exe", "汽水音乐", "kugou"]),
        )
        .as_array()
        .map(|v| {
            v.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}
fn publish(app: &AppHandle, payload: Value) -> Result<()> {
    app.emit(
        "eisland-ipc",
        json!({"channel":"nowplaying:info","args":[payload]}),
    )
    .map_err(|e| e.to_string())
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "media:current-info:get"
            | "media:play-pause"
            | "media:next"
            | "media:prev"
            | "media:seek"
            | "smtc:get-timestamp"
            | "media:accept-source-switch"
            | "media:reject-source-switch"
            | "music:detect-source-app-id"
            | "music:whitelist:get"
            | "music:whitelist:set"
    )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let media = app.state::<Services>().media.clone();
    match channel {
        "media:current-info:get" => Ok(media.sessions.lock().unwrap().payload()),
        "smtc:get-timestamp" => Ok(media.sessions.lock().unwrap().timestamp()),
        "music:detect-source-app-id" => {
            let s = media.sessions.lock().unwrap();
            if let Some(error) = &s.error {
                return Err(error.clone());
            }
            let sources = s.sources();
            Ok(json!({"ok":!sources.is_empty(),"sources":sources,"message":""}))
        }
        "music:whitelist:get" => Ok(json!(media.sessions.lock().unwrap().whitelist)),
        "music:whitelist:set" => {
            let list = args
                .first()
                .and_then(Value::as_array)
                .ok_or("Expected a whitelist array")?;
            let names = list
                .iter()
                .map(|v| {
                    v.as_str()
                        .map(|s| s.trim().to_owned())
                        .ok_or("Expected source name")
                })
                .collect::<std::result::Result<Vec<_>, _>>()?;
            let names = names
                .into_iter()
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>();
            app.state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .write("music-whitelist", &json!(names))?;
            let payload = {
                let mut s = media.sessions.lock().unwrap();
                s.whitelist = names.clone();
                s.select();
                s.payload()
            };
            windows::broadcast(app, "store:music-whitelist", json!(names))?;
            publish(app, payload)?;
            Ok(json!(true))
        }
        "media:accept-source-switch" | "media:reject-source-switch" => {
            let payload = {
                let mut s = media.sessions.lock().unwrap();
                if channel == "media:accept-source-switch" && s.entries.contains_key(&s.pending) {
                    s.current = s.pending.clone();
                }
                s.pending.clear();
                s.payload()
            };
            publish(app, payload)?;
            Ok(Value::Null)
        }
        "media:seek" => {
            let Some(ms) = args
                .first()
                .and_then(Value::as_f64)
                .filter(|v| v.is_finite() && *v >= 0.)
            else {
                return Ok(json!({"success":false,"error":"Invalid seek position"}));
            };
            Ok(media.command("seek", Some(ms / 1000.)).await)
        }
        "media:play-pause" => Ok(media.command("play-pause", None).await),
        "media:next" => Ok(media.command("next", None).await),
        "media:prev" => Ok(media.command("previous", None).await),
        _ => Err("Unknown media operation".into()),
    }
}
