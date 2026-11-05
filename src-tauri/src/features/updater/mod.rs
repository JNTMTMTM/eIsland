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

//! Official signed updater with the existing desktop IPC/event contract.
mod sources;
#[cfg(test)]
mod tests;
mod verification;

use crate::{shared::Result, state::Desktop};
use serde_json::{json, Value};
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_updater::{Update, UpdaterExt};

const MAX_INSTALLER: u64 = 2 * 1024 * 1024 * 1024;
/// Keep signed source URLs and library internals out of IPC-visible errors.
fn updater_error(error: tauri_plugin_updater::Error) -> String {
    use tauri_plugin_updater::Error;
    match error {
        Error::Reqwest(_) | Error::Network(_) => "NATIVE_UPDATE_NETWORK_FAILED",
        Error::Minisign(_)
        | Error::Base64(_)
        | Error::SignatureUtf8(_)
        | Error::SignedVersionMismatch { .. }
        | Error::MissingSignedVersion => "NATIVE_UPDATE_VERIFICATION_FAILED",
        Error::Serialization(_)
        | Error::ReleaseNotFound
        | Error::TargetNotFound(_)
        | Error::TargetsNotFound(_)
        | Error::Semver(_) => "NATIVE_UPDATE_MANIFEST_INVALID",
        Error::UnsupportedArch | Error::UnsupportedOs => "NATIVE_UPDATE_PLATFORM_UNSUPPORTED",
        _ => "NATIVE_UPDATE_OPERATION_FAILED",
    }
    .into()
}
struct Downloaded {
    update: Update,
    bytes: Arc<Vec<u8>>,
}
struct Updater {
    operation: tokio::sync::Mutex<()>,
    downloaded: Mutex<Option<Downloaded>>,
    startup: Mutex<Option<u64>>,
}
fn publish<R: Runtime>(app: &AppHandle<R>, channel: &str, payload: Value) {
    let _ = app.emit("eisland-ipc", json!({"channel":channel,"args":[payload]}));
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "updater:check"
            | "updater:download"
            | "updater:install"
            | "updater:version"
            | "updater:startup-auto-check-ready"
            | "updater:startup-auto-check-received"
    )
}
/// Keep packaging verification out of GUI/single-instance initialization.
pub(crate) fn run_verification_cli() -> bool {
    verification::run_cli()
}
/// Manage updater state per application; isolated tests never share a global installer.
pub fn start(app: &AppHandle) {
    app.manage(Updater {
        operation: tokio::sync::Mutex::new(()),
        downloaded: Mutex::new(None),
        startup: Mutex::new(None),
    });
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(5)).await;
        let enabled = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .value("update-auto-prompt-enabled", json!(true))
            != false;
        if enabled {
            let requested = crate::shared::time::now_ms();
            *app.state::<Updater>().startup.lock().unwrap() = Some(requested);
            publish(
                &app,
                "updater:startup-auto-check-request",
                json!({"requestedAt":requested}),
            );
        }
    });
}
/// Adapt source selection only; version comparison, signatures and install belong to the plugin.
async fn check_feed<R: Runtime>(
    app: &AppHandle<R>,
    endpoint: reqwest::Url,
) -> Result<Option<Update>> {
    let key = app
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|config| config["pubkey"].as_str())
        .unwrap_or("");
    if key.trim().is_empty() {
        return Err("NATIVE_UPDATE_SIGNING_KEY_NOT_CONFIGURED".into());
    }
    let mut update = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(updater_error)?
        .timeout(Duration::from_secs(15))
        .configure_client(|client| {
            client
                .connect_timeout(Duration::from_secs(10))
                .read_timeout(Duration::from_secs(30))
                .gzip(false)
                .brotli(false)
                .deflate(false)
        })
        .build()
        .map_err(updater_error)?
        .check()
        .await
        .map_err(updater_error)?;
    if let Some(update) = &mut update {
        sources::secure_url(&update.download_url)?;
        update.timeout = Some(Duration::from_secs(1800));
    }
    Ok(update)
}
async fn check<R: Runtime>(app: &AppHandle<R>, args: &[Value]) -> Result<Option<Update>> {
    let endpoint = sources::endpoint(args.first(), args.get(1))?;
    let mut update = check_feed(app, endpoint.clone()).await?;
    if let Some(update) = &mut update {
        update.download_url = sources::download_url(args.first(), &endpoint, &update.download_url)?;
    }
    Ok(update)
}
pub async fn handle<R: Runtime>(
    app: &AppHandle<R>,
    channel: &str,
    args: &[Value],
) -> Result<Value> {
    let state = app.state::<Updater>();
    match channel {
        "updater:version" => Ok(json!(app.package_info().version.to_string())),
        "updater:startup-auto-check-ready" => Ok(state
            .startup
            .lock()
            .unwrap()
            .map(|requested| json!({"requestedAt":requested}))
            .unwrap_or(Value::Null)),
        "updater:startup-auto-check-received" => {
            let mut pending = state.startup.lock().unwrap();
            if args.first().and_then(Value::as_u64) == *pending {
                *pending = None;
            }
            Ok(Value::Null)
        }
        "updater:check" => {
            let _guard = state.operation.lock().await;
            match check(app, args).await {
                Ok(update) => {
                    // Rechecking the identical signed release preserves a ready download;
                    // source, artifact, signature or version changes invalidate it.
                    let mut downloaded = state.downloaded.lock().unwrap();
                    let unchanged = update.as_ref().zip(downloaded.as_ref()).is_some_and(
                        |(checked, cached)| {
                            checked.version == cached.update.version
                                && checked.signature == cached.update.signature
                                && checked.download_url == cached.update.download_url
                        },
                    );
                    if !unchanged {
                        *downloaded = None;
                    }
                    drop(downloaded);
                    let available = update.is_some();
                    let current = app.package_info().version.to_string();
                    let version = update
                        .as_ref()
                        .map(|update| update.version.as_str())
                        .unwrap_or(&current);
                    let notes = update
                        .as_ref()
                        .and_then(|update| update.body.as_deref())
                        .unwrap_or("");
                    publish(
                        app,
                        if available {
                            "updater:update-available"
                        } else {
                            "updater:update-not-available"
                        },
                        json!({"version":version,"releaseNotes":notes}),
                    );
                    Ok(
                        json!({"available":available,"version":version,"releaseNotes":notes,"currentVersion":current}),
                    )
                }
                Err(error) => {
                    *state.downloaded.lock().unwrap() = None;
                    Ok(json!({"available":false,"error":error}))
                }
            }
        }
        "updater:download" => {
            let _guard = state.operation.lock().await;
            *state.downloaded.lock().unwrap() = None;
            let result = async {
                let update = check(app, args).await?.ok_or("NATIVE_UPDATE_NOT_NEWER")?;
                let started = Instant::now();
                let mut transferred = 0u64;
                let (limit_tx, mut limit_rx) = tokio::sync::watch::channel(false);
                let downloading = update.download(|length, total| {
                    transferred = transferred.saturating_add(length as u64);
                    if transferred > MAX_INSTALLER || total.is_some_and(|total| total > MAX_INSTALLER) { limit_tx.send_replace(true); }
                    let total = total.unwrap_or(0);
                    publish(app, "updater:download-progress", json!({"percent":if total>0 {transferred as f64 / total as f64 * 100.} else {0.},"transferred":transferred,"total":total,"bytesPerSecond":transferred as f64/started.elapsed().as_secs_f64().max(0.001)}));
                }, || {});
                let bytes = tokio::select! {
                    result = downloading => result.map_err(updater_error)?,
                    _ = limit_rx.changed() => return Err("NATIVE_UPDATE_SIZE_INVALID".into()),
                };
                if bytes.len() as u64 > MAX_INSTALLER { return Err("NATIVE_UPDATE_SIZE_INVALID".into()); }
                let version = update.version.clone();
                *state.downloaded.lock().unwrap() = Some(Downloaded { update, bytes: Arc::new(bytes) });
                publish(app, "updater:update-downloaded", json!({"version":version}));
                Ok::<(), String>(())
            }.await;
            if let Err(error) = &result {
                publish(app, "updater:error", json!({"message":error}));
            }
            Ok(json!(result.is_ok()))
        }
        "updater:install" => {
            let _guard = state.operation.lock().await;
            let downloaded = state
                .downloaded
                .lock()
                .unwrap()
                .take()
                .ok_or("NATIVE_UPDATE_NOT_DOWNLOADED")?;
            // The official installer verifies the cached bytes again before executing NSIS.
            downloaded
                .update
                .install(downloaded.bytes.as_slice())
                .map_err(updater_error)?;
            Ok(json!(true))
        }
        _ => Err("Unknown updater operation".into()),
    }
}
