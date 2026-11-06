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

mod state;
use self::state::Sessions;
use crate::features::windowing as windows;
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, Manager};

pub struct Media {
    stopped: Arc<AtomicBool>,
    sessions: Mutex<Sessions>,
    unsubscribe_ms: AtomicU64,
    #[cfg(windows)]
    recovery: Mutex<std::collections::BTreeMap<String, Value>>,
    #[cfg(windows)]
    api: Mutex<Option<Arc<crate::infrastructure::platform::smtc::Api>>>,
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
        json!({"ready":ready,"error":sessions.error,"sessionCount":sessions.entries.len(),"unsubscribeMs":self.unsubscribe_ms.load(Ordering::Acquire)})
    }
    pub fn new() -> Self {
        Self {
            stopped: Arc::new(AtomicBool::new(false)),
            sessions: Mutex::new(Sessions::new(Vec::new())),
            unsubscribe_ms: AtomicU64::new(0),
            #[cfg(windows)]
            recovery: Mutex::new(std::collections::BTreeMap::new()),
            #[cfg(windows)]
            api: Mutex::new(None),
            #[cfg(windows)]
            command_gate: Mutex::new(()),
            #[cfg(windows)]
            command_slots: Arc::new(tokio::sync::Semaphore::new(16)),
        }
    }
    pub fn set_unsubscribe_ms(&self, milliseconds: u64) {
        self.unsubscribe_ms.store(milliseconds, Ordering::Release);
    }
    fn update(&self, app: &AppHandle, changes: &[Value], full: bool) -> Result<()> {
        // A pruned session can emit a timeline-only delta. Resolve it from the DLL's
        // retained snapshot; retry a busy snapshot on native wait timeouts as well.
        #[cfg(windows)]
        let changes = {
            let sessions = self.sessions.lock().unwrap();
            let mut recovery = self.recovery.lock().unwrap();
            if full {
                recovery.clear();
            }
            let mut incoming = Vec::new();
            for change in changes {
                let Some(id) = change["sourceAppId"].as_str() else {
                    continue;
                };
                if !full
                    && change["removed"] != true
                    && change["mediaChanged"] != true
                    && !sessions.entries.contains_key(id)
                {
                    recovery.insert(id.to_owned(), change.clone());
                } else {
                    recovery.remove(id);
                    incoming.push(change.clone());
                }
            }
            drop(sessions);
            if !recovery.is_empty() {
                let api = self.api.lock().unwrap().clone();
                if let Some(Ok(snapshots)) = api.map(|api| api.snapshot(true)) {
                    for (id, delta) in recovery.iter() {
                        if let Some(snapshot) = snapshots
                            .iter()
                            .find(|value| value["sourceAppId"].as_str() == Some(id.as_str()))
                        {
                            let mut delta = delta.clone();
                            delta["mediaChanged"] = json!(true);
                            delta["artworkChanged"] = json!(true);
                            delta["media"] = snapshot["media"].clone();
                            delta["thumbnail"] = snapshot["media"]["thumbnail"].clone();
                            delta["playback"] = snapshot["playback"].clone();
                            delta["timeline"] = snapshot["timeline"].clone();
                            incoming.push(delta);
                        }
                    }
                    recovery.clear();
                }
            }
            incoming
        };
        #[cfg(not(windows))]
        let changes = changes.to_vec();
        if changes.is_empty() && !full {
            return Ok(());
        }
        let (outbound, pending_before, pending_after) = {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.set_unsubscribe_ms(self.unsubscribe_ms.load(Ordering::Acquire));
            let before = sessions.summary();
            let pending_before = sessions.pending.clone();
            sessions.apply(&changes, full);
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
    pub fn start(self: &Arc<Self>, app: &AppHandle) {
        let stopped = self.stopped.clone();
        self.sessions.lock().unwrap().whitelist = whitelist(app);
        let ttl = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .value("music-smtc-unsubscribe-ms", json!(0));
        let ttl = ttl
            .as_f64()
            .filter(|value| value.is_finite())
            .unwrap_or(0.)
            .round();
        self.set_unsubscribe_ms(if ttl <= 0. {
            0
        } else {
            ttl.clamp(1000., 1_800_000.) as u64
        });
        #[cfg(windows)]
        {
            let media = self.clone();
            let app = app.clone();
            let spawn = std::thread::Builder::new()
                .name("smtc-monitor".into())
                .spawn(move || {
                    let result = (|| -> Result<()> {
                        let path = crate::features::extensions::resolve_native_helper(
                            &app,
                            "smtc",
                            "eIslandSmtcHelper.dll",
                        )?;
                        let api =
                            Arc::new(crate::infrastructure::platform::smtc::Api::load(&path)?);
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
                                    1 => {
                                        let recover = !media.recovery.lock().unwrap().is_empty();
                                        if recover {
                                            media.update(&app, &[], false)?;
                                        }
                                    }
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
                if s.entries.get(&s.current).is_some_and(state::playing) {
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

/// Manage the media feature before starting its native monitor.
pub fn start(app: &AppHandle) {
    let media = Arc::new(Media::new());
    app.manage(media.clone());
    media.start(app);
}
pub fn stop(app: &AppHandle) {
    if let Some(media) = app.try_state::<Arc<Media>>() {
        media.stopped.store(true, Ordering::Release);
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
    let media = app.state::<Arc<Media>>().inner().clone();
    match channel {
        "media:current-info:get" => Ok(media.sessions.lock().unwrap().payload()),
        "smtc:get-timestamp" => Ok(media.sessions.lock().unwrap().timestamp()),
        "music:detect-source-app-id" => {
            #[cfg(windows)]
            let api = media.api.lock().unwrap().clone();
            #[cfg(windows)]
            if let Some(api) = api {
                let snapshots = tauri::async_runtime::spawn_blocking(move || {
                    let mut last_error = "SMTC snapshot unavailable".to_owned();
                    for _ in 0..3 {
                        match api.snapshot(true) {
                            Ok(snapshots) => return Ok(snapshots),
                            Err(error) => last_error = error,
                        }
                        std::thread::sleep(std::time::Duration::from_millis(20));
                    }
                    Err(last_error)
                })
                .await
                .map_err(|e| e.to_string())??;
                let sources = snapshots.iter().map(|session| json!({
                    "sourceAppId":session["sourceAppId"],"isPlaying":state::playing(session),
                    "hasTitle":session["media"]["title"].as_str().is_some_and(|title| !title.is_empty()),
                    "thumbnail":session["media"]["thumbnail"],
                })).collect::<Vec<_>>();
                return Ok(json!({"ok":!sources.is_empty(),"sources":sources,"message":""}));
            }
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
