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

#[path = "agent_chat.rs"]
mod chat;
#[path = "agent_status.rs"]
mod status;
#[path = "agent_tools_system.rs"]
mod system_tools;
#[path = "agent_tools.rs"]
mod tools;
#[path = "agent_usage.rs"]
mod usage;

use crate::{state::Desktop, windows::Result};
use futures_util::future::{AbortHandle, Abortable};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::watch;

struct Chat {
    generation: u64,
    owner: String,
    abort: AbortHandle,
}
struct Execution {
    signature: String,
    result: watch::Sender<Option<Value>>,
    expires: Option<Instant>,
}
static CHATS: OnceLock<Mutex<HashMap<String, Chat>>> = OnceLock::new();
static EXECUTIONS: OnceLock<Mutex<HashMap<String, Execution>>> = OnceLock::new();
static SEQUENCE: AtomicU64 = AtomicU64::new(1);

pub fn handles(channel: &str) -> bool {
    channel.starts_with("ollama:")
        || channel.starts_with("customDirect:")
        || channel.starts_with("codex:")
        || channel.starts_with("claude-code:")
        || matches!(
            channel,
            "agent:local-tool:execute" | "agent-usage:snapshot:get"
        )
}
pub fn start(app: &AppHandle) {
    status::start(app);
}
pub fn stop() {
    CHATS
        .get_or_init(Default::default)
        .lock()
        .unwrap()
        .drain()
        .for_each(|(_, chat)| chat.abort.abort());
    status::stop();
}
pub fn cancel_window(label: &str) {
    CHATS
        .get_or_init(Default::default)
        .lock()
        .unwrap()
        .retain(|_, chat| {
            if chat.owner == label {
                chat.abort.abort();
                false
            } else {
                true
            }
        });
}
pub fn run_hook_cli() -> bool {
    status::run_hook_cli()
}
pub fn now() -> u64 {
    chrono::Utc::now().timestamp_millis().max(0) as u64
}
pub fn store(app: &AppHandle, key: &str, fallback: Value) -> Value {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value(key, fallback)
}
pub fn save(app: &AppHandle, key: &str, value: &Value) -> Result<()> {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write(key, value)?;
    app.emit(
        "eisland-ipc",
        json!({"channel":"settings:changed","args":[format!("store:{key}"),value]}),
    )
    .map_err(|e| e.to_string())
}
pub fn emit(app: &AppHandle, owner: &str, channel: &str, event: Value) -> Result<()> {
    let window = app
        .get_webview_window(owner)
        .ok_or("Chat window was closed")?;
    window
        .emit("eisland-ipc", json!({"channel":channel,"args":[event]}))
        .map_err(|e| e.to_string())
}
pub async fn handle(app: &AppHandle, owner: &str, channel: &str, args: &[Value]) -> Result<Value> {
    let a = args.first().cloned().unwrap_or(Value::Null);
    if channel.starts_with("codex:") || channel.starts_with("claude-code:") {
        return status::handle(app, channel, args).await;
    }
    match channel {
        "agent:local-tool:execute" => return Ok(local_tool(app, &a).await),
        "agent-usage:snapshot:get" => return usage::snapshot(app).await,
        "ollama:ping" => {
            return Ok(json!(
                chat::ping(a.as_str().unwrap_or("http://localhost:11434")).await
            ))
        }
        "ollama:models" => {
            return Ok(chat::models(a.as_str().unwrap_or("http://localhost:11434"))
                .await
                .unwrap_or_else(|_| json!([])))
        }
        "ollama:detectBaseUrl" => {
            for base in [
                "http://localhost:11434",
                "http://127.0.0.1:11434",
                "http://localhost:11435",
                "http://localhost:11436",
            ] {
                if chat::ping(base).await {
                    return Ok(json!(base));
                }
            }
            return Ok(Value::Null);
        }
        "ollama:chat:abort" | "customDirect:chat:abort" => {
            let id = a.as_str().ok_or("Missing chat session")?;
            let item = CHATS
                .get_or_init(Default::default)
                .lock()
                .unwrap()
                .remove(id);
            if let Some(item) = item {
                item.abort.abort();
                return Ok(json!({"aborted":true}));
            }
            return Ok(json!({"aborted":false}));
        }
        "ollama:chat:start" | "customDirect:chat:start" => {
            let id = a
                .as_str()
                .filter(|s| !s.is_empty() && s.len() <= 200)
                .ok_or("Invalid chat session")?
                .to_owned();
            let request = args
                .get(1)
                .filter(|v| v.is_object())
                .ok_or("Missing chat request")?
                .clone();
            let prefix = if channel.starts_with("ollama:") {
                "ollama"
            } else {
                "customDirect"
            };
            let channel = format!("{prefix}:chat:event:{id}");
            let (abort, registration) = AbortHandle::new_pair();
            let generation = SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let mut chats = CHATS.get_or_init(Default::default).lock().unwrap();
            if let Some(previous) = chats.remove(&id) {
                previous.abort.abort();
            }
            if chats.len() >= 64 {
                return Err("Too many concurrent chat sessions".into());
            }
            chats.insert(
                id.clone(),
                Chat {
                    generation,
                    owner: owner.to_owned(),
                    abort,
                },
            );
            drop(chats);
            let app = app.clone();
            let owner = owner.to_owned();
            let session = id.clone();
            tauri::async_runtime::spawn(async move {
                let task = chat::run(&app, &owner, &channel, &request, prefix == "ollama");
                if let Ok(Err(error)) = Abortable::new(task, registration).await {
                    let _ = emit(
                        &app,
                        &owner,
                        &channel,
                        json!({"type":"error","payload":{"code":"LLM_ERROR","message":error}}),
                    );
                }
                let mut chats = CHATS.get_or_init(Default::default).lock().unwrap();
                if chats
                    .get(&session)
                    .is_some_and(|entry| entry.generation == generation)
                {
                    chats.remove(&session);
                }
            });
            return Ok(json!({"started":true,"sessionId":id}));
        }
        _ => {}
    }
    Err(format!("Unknown native agent operation: {channel}"))
}
fn signature(request: &Value) -> String {
    // serde_json maps use sorted keys; arrays retain their original order.
    format!(
        "{}:{}",
        request["tool"].as_str().unwrap_or("").trim().to_lowercase(),
        json!({"arguments":request["arguments"],"workspaces":request["workspaces"]})
    )
}
pub async fn local_tool(app: &AppHandle, request: &Value) -> Value {
    let id = request["requestId"].as_str().unwrap_or("").trim();
    if id.is_empty() {
        return tools::execute(app, request).await;
    }
    let (mut receiver, first) = {
        let mut entries = EXECUTIONS.get_or_init(Default::default).lock().unwrap();
        entries.retain(|_, entry| entry.expires.is_none_or(|expires| expires > Instant::now()));
        let signature = signature(request);
        if let Some(entry) = entries.get(id) {
            if entry.signature != signature {
                return failure("TOOL_REQUEST_ID_CONFLICT", 0);
            }
            (entry.result.subscribe(), false)
        } else {
            if entries.len() >= 500 {
                let completed = entries
                    .iter()
                    .filter(|(_, v)| v.expires.is_some())
                    .min_by_key(|(_, v)| v.expires)
                    .map(|(k, _)| k.clone());
                if let Some(completed) = completed {
                    entries.remove(&completed);
                } else {
                    return failure("TOOL_REQUEST_CACHE_FULL", 0);
                }
            }
            let (result, receiver) = watch::channel(None);
            entries.insert(
                id.to_owned(),
                Execution {
                    signature,
                    result,
                    expires: None,
                },
            );
            (receiver, true)
        }
    };
    if first {
        let app = app.clone();
        let request = request.clone();
        let id = id.to_owned();
        tauri::async_runtime::spawn(async move {
            let result =
                tokio::time::timeout(Duration::from_secs(600), tools::execute(&app, &request))
                    .await
                    .unwrap_or_else(|_| failure("TOOL_EXECUTION_TIMEOUT", 600000));
            if let Some(entry) = EXECUTIONS
                .get_or_init(Default::default)
                .lock()
                .unwrap()
                .get_mut(&id)
            {
                entry.result.send_replace(Some(result));
                entry.expires = Some(Instant::now() + Duration::from_secs(600));
            }
        });
    }
    loop {
        if let Some(value) = receiver.borrow().clone() {
            return value;
        }
        if receiver.changed().await.is_err() {
            return failure("TOOL_EXECUTION_INTERRUPTED", 0);
        }
    }
}
pub fn failure(error: &str, duration: u128) -> Value {
    json!({"success":false,"result":{},"error":error,"durationMs":duration})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tool_signatures_ignore_object_key_order_but_include_workspace() {
        assert_eq!(
            signature(&json!({"tool":" FILE.WRITE ","arguments":{"b":2,"a":1}})),
            signature(&json!({"tool":"file.write","arguments":{"a":1,"b":2}}))
        );
        assert_ne!(
            signature(&json!({"tool":"file.write","workspaces":["a"]})),
            signature(&json!({"tool":"file.write","workspaces":["b"]}))
        );
    }
}
