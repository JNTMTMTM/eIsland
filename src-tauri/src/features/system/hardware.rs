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

use crate::infrastructure::platform::{
    brightness,
    volume::{self, Operation},
};
use crate::shared::Result;
use serde_json::{json, Value};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};
use tokio::sync::{oneshot, watch, Notify};

#[derive(Clone, Copy)]
enum Kind {
    Volume,
    Brightness,
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
}
pub struct Hardware {
    stopped: AtomicBool,
    shutdown: watch::Sender<bool>,
    volume: Arc<Control>,
    brightness: Arc<Control>,
}
impl Control {
    fn new(kind: Kind) -> Arc<Self> {
        Arc::new(Self {
            kind,
            cache: Mutex::new(None),
            gate: tokio::sync::Mutex::new(()),
            pending: Mutex::new(Pending::default()),
            notify: Notify::new(),
        })
    }
    async fn get(&self) -> Result<Value> {
        let _guard = self.gate.lock().await;
        if matches!(self.kind, Kind::Volume) {
            // Resolve the default output on every read so device switches are visible immediately.
            return volume::run(Operation::Get).await;
        }
        if let Some((at, value)) = self.cache.lock().unwrap().as_ref() {
            if at.elapsed() < Duration::from_millis(250) {
                return Ok(value.clone());
            }
        }
        let result = tauri::async_runtime::spawn_blocking(brightness::get)
            .await
            .map_err(|error| error.to_string())?;
        let result = json!(result);
        *self.cache.lock().unwrap() = Some((Instant::now(), result.clone()));
        Ok(result)
    }
    async fn set(&self, value: u8, mut shutdown: watch::Receiver<bool>) -> bool {
        let (sender, receiver) = oneshot::channel();
        {
            let mut pending = self.pending.lock().unwrap();
            if *shutdown.borrow() {
                return false;
            }
            pending.value = Some(value);
            pending.waiters.push(sender);
        }
        self.notify.notify_one();
        tokio::select! {
            result = receiver => result.unwrap_or(false),
            _ = shutdown.changed() => false,
        }
    }
}
impl Hardware {
    pub fn new() -> Self {
        let (shutdown, _) = watch::channel(false);
        Self {
            stopped: AtomicBool::new(false),
            shutdown,
            volume: Control::new(Kind::Volume),
            brightness: Control::new(Kind::Brightness),
        }
    }
}

fn setter(control: Arc<Control>, mut shutdown: watch::Receiver<bool>) {
    tauri::async_runtime::spawn(async move {
        'worker: loop {
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
                if *shutdown.borrow() {
                    break 'worker;
                }
                *control.cache.lock().unwrap() = None;
                let result = match control.kind {
                    Kind::Volume => volume::run(Operation::Set(target)).await,
                    Kind::Brightness => {
                        tauri::async_runtime::spawn_blocking(move || brightness::set(target))
                            .await
                            .map(|value| json!(value))
                            .map_err(|error| error.to_string())
                    }
                };
                let success = result.as_ref().is_ok_and(|value| value == true);
                if let Err(error) = result {
                    eprintln!("[Hardware] set: {error}");
                }
                *control.cache.lock().unwrap() = None;
                drop(guard);
                if *shutdown.borrow() {
                    break 'worker;
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

pub fn start(app: &AppHandle) {
    app.manage(Hardware::new());
    let hardware = app.state::<Hardware>();
    let shutdown = hardware.shutdown.subscribe();
    setter(hardware.volume.clone(), shutdown.clone());
    setter(hardware.brightness.clone(), shutdown);
}

pub fn stop(app: &AppHandle) {
    if let Some(hardware) = app.try_state::<Hardware>() {
        hardware.stopped.store(true, Ordering::Release);
        hardware.shutdown.send_replace(true);
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
    let hardware = app.state::<Hardware>();
    if hardware.stopped.load(std::sync::atomic::Ordering::Acquire) {
        return Err("System services stopped".into());
    }
    if channel == "media:get-volume" {
        return Ok(json!(0.5));
    }
    if channel == "media:set-volume" {
        return Ok(Value::Null);
    } // Existing SMTC API has no application-volume control.
    if matches!(channel, "media:get-muted" | "media:toggle-muted") {
        let _guard = hardware.volume.gate.lock().await;
        return volume::run(if channel == "media:get-muted" {
            Operation::GetMute
        } else {
            Operation::ToggleMute
        })
        .await;
    }
    let control = if channel.starts_with("system:volume:") {
        &hardware.volume
    } else {
        &hardware.brightness
    };
    if channel.ends_with(":get") {
        return control.get().await;
    }
    let Some(value) = args
        .first()
        .and_then(Value::as_f64)
        .filter(|v| v.is_finite())
    else {
        return Ok(json!(false));
    };
    Ok(json!(
        control
            .set(
                value.round().clamp(0., 100.) as u8,
                hardware.shutdown.subscribe()
            )
            .await
    ))
}
