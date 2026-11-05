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

use crate::features::windowing as windows;
use crate::shared::Result;
use crate::state::Desktop;
use futures_util::StreamExt;
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, HashSet},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Manager};
use tokio::sync::Notify;

pub struct Runtime {
    stopped: Arc<AtomicBool>,
    deadlines: Mutex<BTreeMap<(String, String), i64>>,
    notify: Notify,
}
pub fn start(app: &AppHandle) {
    let stopped = Arc::new(AtomicBool::new(false));
    app.manage(Runtime {
        stopped: stopped.clone(),
        deadlines: Mutex::new(BTreeMap::new()),
        notify: Notify::new(),
    });
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut last_clipboard = None;
        let mut initialized = false;
        let mut title_task: Option<tauri::async_runtime::JoinHandle<()>> = None;
        let mut sequence = 0u32;
        let mut offset = -chrono::Local::now().offset().local_minus_utc() / 60;
        while !stopped.load(Ordering::Acquire) {
            let runtime = app.state::<Runtime>();
            let now = crate::shared::time::now_ms() as i64;
            let next_offset = -chrono::Local::now().offset().local_minus_utc() / 60;
            let (due, next) = {
                let mut deadlines = runtime.deadlines.lock().unwrap();
                deadlines.retain(|(owner, _), _| app.get_webview_window(owner).is_some());
                if offset != next_offset {
                    let owners = deadlines
                        .keys()
                        .map(|(owner, _)| owner.clone())
                        .collect::<HashSet<_>>();
                    for owner in owners {
                        let _ = windows::emit(
                            &app,
                            &owner,
                            "settings:changed",
                            json!(["runtime:clock-changed", next_offset]),
                        );
                    }
                    offset = next_offset;
                }
                let due = deadlines
                    .iter()
                    .filter(|(_, deadline)| **deadline <= now)
                    .map(|(key, _)| key.clone())
                    .collect::<Vec<_>>();
                for key in &due {
                    deadlines.remove(key);
                }
                let next = deadlines.values().copied().min();
                (due, next)
            };
            for (owner, id) in due {
                let _ = windows::emit(
                    &app,
                    &owner,
                    "settings:changed",
                    json!(["runtime:wakeup", id]),
                );
            }
            let enabled = setting(&app, "clipboard-url-monitor-enabled", json!(true)) == true;
            if enabled {
                #[cfg(windows)]
                let current_sequence = unsafe {
                    windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber()
                };
                #[cfg(not(windows))]
                let current_sequence = sequence.wrapping_add(1);
                if current_sequence != sequence || !initialized {
                    sequence = current_sequence;
                    let value = tauri::async_runtime::spawn_blocking(|| {
                        arboard::Clipboard::new()
                            .ok()
                            .and_then(|mut c| c.get_text().ok())
                    })
                    .await
                    .ok()
                    .flatten();
                    let baseline = !initialized;
                    initialized = true;
                    if value != last_clipboard {
                        if let Some(task) = title_task.take() {
                            task.abort();
                        }
                        last_clipboard = value.clone();
                        if !baseline {
                            if let Some(text) = value {
                                let mode =
                                    setting(&app, "clipboard-url-detect-mode", json!("http-https"));
                                let blacklist = setting(&app, "clipboard-url-blacklist", json!([]));
                                let urls = extract_urls(
                                    &text,
                                    mode.as_str().unwrap_or("http-https"),
                                    &blacklist,
                                );
                                if !urls.is_empty() {
                                    let handle = app.clone();
                                    title_task = Some(tauri::async_runtime::spawn(async move {
                                        let title = page_title(&urls[0]).await.unwrap_or_default();
                                        let _ = windows::emit(
                                            &handle,
                                            "main",
                                            "clipboard:urls-detected",
                                            json!([{"title":title,"urls":urls}]),
                                        );
                                    }));
                                }
                            }
                        }
                    }
                }
            } else {
                last_clipboard = None;
                initialized = false;
                if let Some(task) = title_task.take() {
                    task.abort();
                }
            }
            let wait = match (next, enabled) {
                (Some(deadline), true) => {
                    Duration::from_millis((deadline - now).clamp(1, 1000) as u64)
                }
                (Some(deadline), false) => {
                    Duration::from_millis((deadline - now).clamp(1, 60000) as u64)
                }
                (None, true) => Duration::from_secs(1),
                (None, false) => Duration::from_secs(3600),
            };
            tokio::select! {_=runtime.notify.notified()=>{},_=tokio::time::sleep(wait)=>{}}
        }
        if let Some(task) = title_task {
            task.abort();
        }
    });
}
pub fn stop(app: &AppHandle) {
    if let Some(runtime) = app.try_state::<Runtime>() {
        runtime.stopped.store(true, Ordering::Release);
        runtime.notify.notify_one();
    }
}
pub fn changed(app: &AppHandle) {
    if let Some(runtime) = app.try_state::<Runtime>() {
        runtime.notify.notify_one();
    }
}
pub fn cancel_window(app: &AppHandle, label: &str) {
    if let Some(runtime) = app.try_state::<Runtime>() {
        runtime
            .deadlines
            .lock()
            .unwrap()
            .retain(|(owner, _), _| owner != label);
        runtime.notify.notify_one();
    }
}
pub fn schedule(app: &AppHandle, owner: &str, args: &[Value]) -> Result<Value> {
    let id = args
        .first()
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty() && id.len() <= 100)
        .ok_or("Invalid wakeup id")?;
    let deadline = args.get(1).unwrap_or(&Value::Null);
    let runtime = app.state::<Runtime>();
    let mut deadlines = runtime.deadlines.lock().unwrap();
    let key = (owner.to_owned(), id.to_owned());
    if deadline.is_null() {
        deadlines.remove(&key);
    } else {
        let deadline = deadline
            .as_f64()
            .filter(|v| v.is_finite() && *v >= i64::MIN as f64 && *v <= i64::MAX as f64)
            .ok_or("Invalid wakeup deadline")? as i64;
        if !deadlines.contains_key(&key)
            && deadlines.keys().filter(|(label, _)| label == owner).count() >= 64
        {
            return Ok(json!(false));
        }
        deadlines.insert(key, deadline);
    }
    drop(deadlines);
    runtime.notify.notify_one();
    Ok(json!(true))
}
fn setting(app: &AppHandle, key: &str, fallback: Value) -> Value {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value(key, fallback)
}
pub fn handles(channel: &str) -> bool {
    channel.starts_with("clipboard:url-")
        || matches!(channel, "clipboard:read-text" | "alarm:set-enabled")
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    if channel == "clipboard:read-text" {
        return tauri::async_runtime::spawn_blocking(|| {
            arboard::Clipboard::new()
                .map_err(|e| e.to_string())?
                .get_text()
                .map(Value::String)
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    if channel == "alarm:set-enabled" {
        let id = a.as_u64().ok_or("Invalid alarm id")?;
        let enabled = args
            .get(1)
            .and_then(Value::as_bool)
            .ok_or("Invalid alarm state")?;
        let state = app.state::<Desktop>();
        let store = state.store.lock().unwrap();
        let mut alarms = store.value("alarms", json!([]));
        let Some(alarm) = alarms
            .as_array_mut()
            .and_then(|rows| rows.iter_mut().find(|row| row["id"] == id))
        else {
            return Ok(json!(false));
        };
        alarm["enabled"] = json!(enabled);
        store.write("alarms", &alarms)?;
        drop(store);
        windows::broadcast(app, "store:alarms", alarms)?;
        return Ok(json!(true));
    }
    let (base, operation) = channel
        .rsplit_once(':')
        .ok_or("Invalid clipboard operation")?;
    let (key, fallback) = match base {
        "clipboard:url-blacklist" => ("clipboard-url-blacklist", json!([])),
        "clipboard:url-detect-mode" => ("clipboard-url-detect-mode", json!("http-https")),
        "clipboard:url-monitor" => ("clipboard-url-monitor-enabled", json!(true)),
        _ => return Err("Unknown clipboard preference".into()),
    };
    if operation == "get" {
        return Ok(setting(app, key, fallback));
    }
    let next = if operation == "add-domain" {
        let mut values = setting(app, key, json!([]))
            .as_array()
            .cloned()
            .unwrap_or_default();
        let domain =
            normalize_domain(a.as_str().ok_or("Domain missing")?).ok_or("Invalid domain")?;
        if !values.iter().any(|v| v == &domain) {
            values.push(json!(domain));
        }
        json!(values)
    } else if operation == "set" {
        match base {
            "clipboard:url-blacklist" => {
                let mut values = a
                    .as_array()
                    .ok_or("Blacklist must be an array")?
                    .iter()
                    .filter_map(Value::as_str)
                    .filter_map(normalize_domain)
                    .collect::<Vec<_>>();
                values.sort();
                values.dedup();
                json!(values)
            }
            "clipboard:url-detect-mode" => {
                if !matches!(
                    a.as_str(),
                    Some("https-only" | "http-https" | "domain-only")
                ) {
                    return Err("Invalid clipboard detection mode".into());
                }
                a.clone()
            }
            _ => json!(a.as_bool().ok_or("Expected boolean")?),
        }
    } else {
        return Err("Unknown clipboard operation".into());
    };
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write(key, &next)?;
    changed(app);
    windows::broadcast(app, base, next)?;
    Ok(json!(true))
}
fn normalize_domain(domain: &str) -> Option<String> {
    let url = if domain.contains("://") {
        domain.trim().to_owned()
    } else {
        format!("https://{}", domain.trim())
    };
    reqwest::Url::parse(&url)
        .ok()?
        .host_str()
        .map(|s| s.trim_end_matches('.').to_lowercase())
}
fn extract_urls(text: &str, mode: &str, blacklist: &Value) -> Vec<String> {
    let pattern = match mode {
        "https-only" => r#"(?i)https://[^\s<>"{}|\\^`\[\]]+"#,
        "domain-only" => {
            r#"(?i)\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:/[^\s<>"{}|\\^`\[\]]*)?"#
        }
        _ => r#"(?i)https?://[^\s<>"{}|\\^`\[\]]+"#,
    };
    let regex = regex::Regex::new(pattern).expect("URL regex");
    let mut seen = HashSet::new();
    regex
        .find_iter(&text[..text.floor_char_boundary(65536.min(text.len()))])
        .filter_map(|m| {
            let url = if mode == "domain-only" {
                format!("https://{}", m.as_str())
            } else {
                m.as_str().to_owned()
            };
            let host = normalize_domain(&url)?;
            if blacklist.as_array().is_some_and(|rows| {
                rows.iter()
                    .filter_map(Value::as_str)
                    .any(|domain| host == domain || host.ends_with(&format!(".{domain}")))
            }) || !seen.insert(url.to_lowercase())
            {
                None
            } else {
                Some(url)
            }
        })
        .take(32)
        .collect()
}
async fn page_title(url: &str) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .ok()?;
    let response = client.get(url).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let mut stream = response.bytes_stream();
    let mut bytes = Vec::new();
    while let Some(Ok(chunk)) = stream.next().await {
        let remaining = 32768usize.saturating_sub(bytes.len());
        bytes.extend_from_slice(&chunk[..remaining.min(chunk.len())]);
        if bytes.len() >= 32768 {
            break;
        }
    }
    let html = String::from_utf8_lossy(&bytes);
    let pattern = regex::Regex::new(r"(?is)<title[^>]*>(.*?)</title>").ok()?;
    let title = pattern
        .captures(&html)?
        .get(1)?
        .as_str()
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
    Some(title.trim().chars().take(256).collect())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn urls_respect_modes_and_subdomain_blacklist() {
        assert_eq!(
            extract_urls("http://a.test https://b.test", "https-only", &json!([])),
            vec!["https://b.test"]
        );
        assert!(
            extract_urls("https://sub.bad.test", "http-https", &json!(["bad.test"])).is_empty()
        );
        assert_eq!(
            extract_urls("example.com/path", "domain-only", &json!([])),
            vec!["https://example.com/path"]
        );
    }
}
