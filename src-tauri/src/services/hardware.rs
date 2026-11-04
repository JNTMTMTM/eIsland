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

use super::{native_path, Services};
use crate::windows::Result;
use serde_json::{json, Value};
use std::{
    process::Stdio,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, BufReader},
    process::Command,
    sync::{oneshot, watch, Notify},
};

#[derive(Clone, Copy)]
enum Kind {
    Volume,
    Brightness,
}
impl Kind {
    fn component(self) -> &'static str {
        match self {
            Self::Volume => "volume",
            Self::Brightness => "brightness",
        }
    }
    fn executable(self) -> &'static str {
        match self {
            Self::Volume => "eIslandVolumeHelper.exe",
            Self::Brightness => "eIslandBrightnessReader.exe",
        }
    }
    fn field(self) -> &'static str {
        match self {
            Self::Volume => "level",
            Self::Brightness => "currentBrightness",
        }
    }
}
#[derive(Default)]
struct Pending {
    value: Option<u8>,
    waiters: Vec<oneshot::Sender<bool>>,
}
struct Control {
    kind: Kind,
    cache: Mutex<Option<(Instant, Value)>>,
    gate: tokio::sync::Mutex<()>,
    pending: Mutex<Pending>,
    notify: Notify,
    monitoring: AtomicBool,
}
pub struct Hardware {
    volume: Arc<Control>,
    brightness: Arc<Control>,
    mute: tokio::sync::Mutex<()>,
}
impl Control {
    fn new(kind: Kind) -> Arc<Self> {
        Arc::new(Self {
            kind,
            cache: Mutex::new(None),
            gate: tokio::sync::Mutex::new(()),
            pending: Mutex::new(Pending::default()),
            notify: Notify::new(),
            monitoring: AtomicBool::new(false),
        })
    }
    async fn get(&self, app: &AppHandle) -> Result<Value> {
        let _guard = self.gate.lock().await;
        if let Some((at, value)) = self.cache.lock().unwrap().as_ref() {
            let event_driven = self.monitoring.load(Ordering::Acquire)
                && (matches!(self.kind, Kind::Volume) || value["source"] == "wmi");
            if event_driven || at.elapsed() < Duration::from_millis(250) {
                return Ok(value[self.kind.field()].clone());
            }
        }
        let value = call(app, self.kind, &["get".into()]).await?;
        let result = value[self.kind.field()].clone();
        *self.cache.lock().unwrap() = Some((Instant::now(), value));
        Ok(result)
    }
    async fn set(&self, value: u8) -> bool {
        let (sender, receiver) = oneshot::channel();
        {
            let mut pending = self.pending.lock().unwrap();
            pending.value = Some(value);
            pending.waiters.push(sender);
        }
        self.notify.notify_one();
        receiver.await.unwrap_or(false)
    }
}
impl Hardware {
    pub fn new() -> Self {
        Self {
            volume: Control::new(Kind::Volume),
            brightness: Control::new(Kind::Brightness),
            mute: tokio::sync::Mutex::new(()),
        }
    }
}

fn command(app: &AppHandle, kind: Kind) -> Result<Command> {
    let path = native_path(app, kind.component(), kind.executable())?;
    let mut command = Command::new(path);
    command.kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    Ok(command)
}

/// Bound both execution time and output size; dropping the timed-out child kills it.
async fn call(app: &AppHandle, kind: Kind, args: &[String]) -> Result<Value> {
    let mut child = command(app, kind)?
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    let mut output = child
        .stdout
        .take()
        .ok_or("Missing helper stdout")?
        .take(65537);
    let read = async {
        let mut bytes = Vec::new();
        output
            .read_to_end(&mut bytes)
            .await
            .map_err(|e| e.to_string())?;
        if bytes.len() > 65536 {
            return Err("Helper output exceeds limit".into());
        }
        let status = child.wait().await.map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("{} helper exited: {status}", kind.component()));
        }
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())
    };
    tokio::time::timeout(Duration::from_secs(5), read)
        .await
        .map_err(|_| "Hardware helper timed out".to_owned())?
}

fn setter(app: AppHandle, control: Arc<Control>, mut shutdown: watch::Receiver<bool>) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! { _ = shutdown.changed() => break, _ = control.notify.notified() => {} }
            let mut waiters = Vec::new();
            loop {
                let target = {
                    let mut pending = control.pending.lock().unwrap();
                    waiters.append(&mut pending.waiters);
                    pending.value.take()
                };
                let Some(target) = target else {
                    break;
                };
                let guard = control.gate.lock().await;
                *control.cache.lock().unwrap() = None;
                let result = call(&app, control.kind, &["set".into(), target.to_string()]).await;
                let success = result.as_ref().is_ok_and(|v| v["success"] == true);
                if let Err(error) = result {
                    eprintln!("[Hardware] {} set: {error}", control.kind.component());
                }
                *control.cache.lock().unwrap() = None;
                drop(guard);
                if *shutdown.borrow() {
                    waiters.into_iter().for_each(|w| {
                        let _ = w.send(false);
                    });
                    return;
                }
                let pending = control.pending.lock().unwrap();
                if pending.value.is_some() {
                    drop(pending);
                    continue;
                }
                drop(pending);
                waiters.drain(..).for_each(|w| {
                    let _ = w.send(success);
                });
                break;
            }
        }
        let mut pending = control.pending.lock().unwrap();
        pending.waiters.drain(..).for_each(|w| {
            let _ = w.send(false);
        });
    });
}

async fn monitor(
    app: &AppHandle,
    control: &Control,
    shutdown: &mut watch::Receiver<bool>,
) -> Result<()> {
    let mut child = command(app, control.kind)?
        .arg("monitor")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    // Keeping stdin open is the helpers' lifetime contract; parent exit closes it too.
    let _stdin = child.stdin.take();
    let mut lines = BufReader::new(child.stdout.take().ok_or("Missing monitor stdout")?).lines();
    loop {
        tokio::select! {
            _ = shutdown.changed() => { let _ = child.kill().await; return Ok(()); },
            line = lines.next_line() => {
                let Some(line) = line.map_err(|e|e.to_string())? else { return Err("Hardware monitor closed stdout".into()); };
                if line.len() > 65536 { return Err("Hardware monitor output exceeds limit".into()); }
                if let Ok(event) = serde_json::from_str::<Value>(&line) {
                    let value = match control.kind { Kind::Volume => event["level"].clone(), Kind::Brightness => event["brightness"].clone() };
                    if value.is_number() {
                        control.monitoring.store(true,Ordering::Release);
                        let mut snapshot = json!({}); snapshot[control.kind.field()] = value;
                        if matches!(control.kind,Kind::Brightness) { snapshot["source"] = json!("wmi"); }
                        *control.cache.lock().unwrap() = Some((Instant::now(),snapshot));
                    } else if event["error"].is_string() || event["eventName"] == "error" {
                        control.monitoring.store(false,Ordering::Release);
                        *control.cache.lock().unwrap() = None;
                        eprintln!("[Hardware] monitor: {event}");
                    }
                }
            }
        }
    }
}

pub fn start(app: &AppHandle, shutdown: watch::Receiver<bool>) {
    if !cfg!(windows) {
        return;
    }
    let services = app.state::<Services>();
    for control in [
        services.hardware.volume.clone(),
        services.hardware.brightness.clone(),
    ] {
        setter(app.clone(), control.clone(), shutdown.clone());
        let app = app.clone();
        let mut shutdown = shutdown.clone();
        tauri::async_runtime::spawn(async move {
            for attempt in 0..3 {
                if *shutdown.borrow() {
                    return;
                }
                if let Err(error) = monitor(&app, &control, &mut shutdown).await {
                    eprintln!("[Hardware] {} monitor: {error}", control.kind.component());
                }
                control.monitoring.store(false, Ordering::Release);
                if *shutdown.borrow() {
                    return;
                }
                tokio::select! { _ = shutdown.changed() => return, _ = tokio::time::sleep(Duration::from_secs(2_u64.pow(attempt + 1))) => {} }
            }
        });
    }
}

pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "system:volume:get"
            | "system:volume:set"
            | "system:brightness:get"
            | "system:brightness:set"
            | "media:get-muted"
            | "media:toggle-muted"
            | "media:get-volume"
            | "media:set-volume"
    )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let services = app.state::<Services>();
    if services.stopped.load(std::sync::atomic::Ordering::Acquire) {
        return Err("System services stopped".into());
    }
    if channel == "media:get-volume" {
        return Ok(json!(0.5));
    }
    if channel == "media:set-volume" {
        return Ok(Value::Null);
    } // Existing SMTC API has no application-volume control.
    let hardware = &services.hardware;
    if matches!(channel, "media:get-muted" | "media:toggle-muted") {
        let _guard = hardware.mute.lock().await;
        let current = call(app, Kind::Volume, &["get-mute".into()]).await?;
        if channel == "media:get-muted" {
            return Ok(current["muted"].clone());
        }
        let Some(muted) = current["muted"].as_bool() else {
            return Ok(Value::Null);
        };
        let result = call(
            app,
            Kind::Volume,
            &["set-mute".into(), (!muted).to_string()],
        )
        .await?;
        return Ok(if result["success"] == true {
            json!(!muted)
        } else {
            Value::Null
        });
    }
    let control = if channel.starts_with("system:volume:") {
        &hardware.volume
    } else {
        &hardware.brightness
    };
    if channel.ends_with(":get") {
        return control.get(app).await;
    }
    let Some(value) = args
        .first()
        .and_then(Value::as_f64)
        .filter(|v| v.is_finite())
    else {
        return Ok(json!(false));
    };
    Ok(json!(
        control.set(value.round().clamp(0., 100.) as u8).await
    ))
}
