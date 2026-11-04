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

use super::music_window::AuthWindow;
use crate::{state::Desktop, windows::Result};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    process::Stdio,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
    sync::{oneshot, watch},
};

type Pending = Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value>>>>>;
struct Runner {
    input: Arc<tokio::sync::Mutex<tokio::process::ChildStdin>>,
    pending: Pending,
    alive: Arc<AtomicBool>,
}
pub struct Music {
    runner: tokio::sync::Mutex<Option<Arc<Runner>>>,
    sequence: AtomicU64,
    pub window: AuthWindow,
    pub shutdown: watch::Sender<bool>,
}
pub fn handles(channel: &str) -> bool {
    channel == "net:fetch"
        || channel.starts_with("qishui:")
        || channel.starts_with("music-provider-auth:")
        || matches!(
            channel,
            "music:lyrics-source:get"
                | "music:lyrics-source:set"
                | "music:provider-mode:get"
                | "music:provider-mode:set"
                | "music:lyrics-enabled:get"
                | "music:lyrics-enabled:set"
                | "music:lyrics-translation-enabled:get"
                | "music:lyrics-translation-enabled:set"
                | "music:lyrics-karaoke:get"
                | "music:lyrics-karaoke:set"
                | "music:lyrics-clock:get"
                | "music:lyrics-clock:set"
                | "music:lyrics-calibrate-enabled:get"
                | "music:lyrics-calibrate-enabled:set"
                | "music:lyrics-calibrate-delay:get"
                | "music:lyrics-calibrate-delay:set"
                | "music:smtc-unsubscribe-ms:get"
                | "music:smtc-unsubscribe-ms:set"
        )
}
impl Music {
    pub fn new() -> Self {
        let (shutdown, _) = watch::channel(false);
        Self {
            runner: tokio::sync::Mutex::new(None),
            sequence: AtomicU64::new(1),
            window: AuthWindow::new(),
            shutdown,
        }
    }
    fn resources(app: &AppHandle) -> Result<std::path::PathBuf> {
        let path = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("music");
        if path.join("entry.cjs").is_file() {
            return Ok(path);
        }
        #[cfg(debug_assertions)]
        {
            let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/music");
            if path.join("entry.cjs").is_file() {
                return Ok(path);
            }
        }
        Err("Music runtime missing; run npm run native:tauri".into())
    }
    async fn start(&self, app: &AppHandle) -> Result<Arc<Runner>> {
        let mut slot = self.runner.lock().await;
        if let Some(runner) = slot.as_ref() {
            if runner.alive.load(Ordering::Acquire) {
                return Ok(runner.clone());
            }
        }
        let resources = Self::resources(app)?;
        let store = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .directory
            .clone();
        let data = store
            .parent()
            .ok_or("Missing music data directory")?
            .to_path_buf();
        let mut command =
            Command::new(resources.join(if cfg!(windows) { "node.exe" } else { "node" }));
        command
            .arg(resources.join("entry.cjs"))
            .env("EISLAND_MUSIC_DATA", data)
            .env("EISLAND_MUSIC_STORE", store)
            .env_remove("NODE_OPTIONS")
            .env_remove("NODE_PATH")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(0x08000000);
        let mut child = command.spawn().map_err(|e| e.to_string())?;
        let input = Arc::new(tokio::sync::Mutex::new(
            child.stdin.take().ok_or("Music stdin unavailable")?,
        ));
        let output = child.stdout.take().ok_or("Music stdout unavailable")?;
        let errors = child.stderr.take().ok_or("Music stderr unavailable")?;
        let alive = Arc::new(AtomicBool::new(true));
        let runner = Arc::new(Runner {
            input: input.clone(),
            pending: Arc::new(Mutex::new(HashMap::new())),
            alive: alive.clone(),
        });
        let pending = runner.pending.clone();
        let app = app.clone();
        let mut shutdown = self.shutdown.subscribe();
        tauri::async_runtime::spawn(async move {
            let mut output = BufReader::new(output).lines();
            loop {
                tokio::select! {
                    _ = shutdown.changed() => break,
                    line = output.next_line() => {
                        let Ok(Some(line)) = line else { break; };
                        if line.len() > 33554432 { break; }
                        let Ok(message) = serde_json::from_str::<Value>(&line) else { break; };
                        match message["kind"].as_str() {
                            Some("result") => {
                                let id = message["id"].as_u64().unwrap_or(0);
                                if let Some(sender) = pending.lock().unwrap().remove(&id) {
                                    let result = if let Some(error) = message["error"].as_str() { Err(error.to_owned()) } else { Ok(message["result"].clone()) };
                                    let _ = sender.send(result);
                                }
                            },
                            Some("event") => {
                                if matches!(message["channel"].as_str(),Some("settings:changed")) {
                                    let _ = app.emit("eisland-ipc",json!({"channel":message["channel"],"args":message["args"]}));
                                }
                            },
                            Some("host") => {
                                let app = app.clone(); let input = input.clone();
                                tauri::async_runtime::spawn(async move {
                                    let operation = message["operation"].as_str().unwrap_or("");
                                    let services = app.state::<super::Services>();
                                    let result = if operation == "sources" { super::media::handle(&app,"music:detect-source-app-id",&[]).await }
                                        else { services.music.window.handle(&app,operation,&message["args"]).await };
                                    let response = match result { Ok(result)=>json!({"kind":"host-result","id":message["id"],"result":result}), Err(error)=>json!({"kind":"host-result","id":message["id"],"error":error}) };
                                    let _ = send(&input,&response).await;
                                });
                            },
                            _ => break,
                        }
                    }
                }
            }
            // Let the original audio service remove its temporary cache before killing a
            // stuck helper. Parent-process termination also closes stdin on Windows.
            let _ = send(&input, &json!({"kind":"shutdown"})).await;
            if tokio::time::timeout(Duration::from_secs(2), child.wait())
                .await
                .is_err()
            {
                let _ = child.kill().await;
            }
            if let Some(window) = app.get_webview_window("qishui-auth") {
                let _ = window.destroy();
            }
            alive.store(false, Ordering::Release);
            pending.lock().unwrap().drain().for_each(|(_, sender)| {
                let _ = sender.send(Err("Music helper stopped".into()));
            });
        });
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(errors).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[Music] {line}");
            }
        });
        *slot = Some(runner.clone());
        Ok(runner)
    }
    pub async fn request(&self, app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
        let runner = self.start(app).await?;
        let id = self.sequence.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = oneshot::channel();
        runner.pending.lock().unwrap().insert(id, sender);
        let result = send(
            &runner.input,
            &json!({"id":id,"channel":channel,"args":args}),
        )
        .await;
        if let Err(error) = result {
            runner.pending.lock().unwrap().remove(&id);
            return Err(error);
        }
        let wait = if channel == "music-provider-auth:check-qr" {
            310
        } else {
            65
        };
        let result = tokio::time::timeout(Duration::from_secs(wait), receiver).await;
        runner.pending.lock().unwrap().remove(&id);
        result
            .map_err(|_| "Music operation timed out".to_owned())?
            .map_err(|_| "Music helper closed".to_owned())?
    }
}
async fn send(
    input: &tokio::sync::Mutex<tokio::process::ChildStdin>,
    message: &Value,
) -> Result<()> {
    let mut bytes = serde_json::to_vec(message).map_err(|e| e.to_string())?;
    bytes.push(b'\n');
    input
        .lock()
        .await
        .write_all(&bytes)
        .await
        .map_err(|e| e.to_string())
}
