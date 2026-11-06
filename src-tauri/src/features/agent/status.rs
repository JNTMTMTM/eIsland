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

use super::{now, save, store, usage};
use crate::shared::Result;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File},
    io::{BufReader, Read, Seek, SeekFrom, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        mpsc, Mutex, OnceLock,
    },
    time::{Duration, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};

const PORT: u16 = 17861;
const MARKER: &str = "eisland-claude-code-status";
const HOOKS: &[&str] = &[
    "UserPromptSubmit",
    "SessionStart",
    "SessionEnd",
    "Stop",
    "StopFailure",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "PostToolUseFailure",
    "PermissionDenied",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
];
static STOPPED: AtomicBool = AtomicBool::new(false);
static RUNNING: AtomicBool = AtomicBool::new(false);
static STARTED: AtomicBool = AtomicBool::new(false);
static HOOK_REQUESTS: AtomicUsize = AtomicUsize::new(0);
struct Permission {
    id: String,
    sender: mpsc::Sender<String>,
}
static PERMISSIONS: OnceLock<Mutex<HashMap<String, Permission>>> = OnceLock::new();
#[derive(Default)]
struct Log {
    offset: u64,
    id: String,
    cwd: Value,
    events: Vec<Value>,
    heatmap: HashMap<String, Value>,
}
static CLAUDE_EVENTS: Mutex<()> = Mutex::new(());
static LOGS: OnceLock<Mutex<HashMap<PathBuf, Log>>> = OnceLock::new();
const EXTERNAL_AGENTS: [(&str, &str); 5] = [
    ("claude.exe", "Claude Code"),
    ("cursor.exe", "Cursor"),
    ("codex.exe", "Codex"),
    ("gemini cli.exe", "Gemini CLI"),
    ("opencode.exe", "OpenCode"),
];
#[derive(Default)]
struct ExternalAgentEdges {
    running: [bool; 5],
}
impl ExternalAgentEdges {
    fn advance(
        &mut self,
        names: &HashSet<String>,
        enabled: bool,
    ) -> (Vec<&'static str>, Vec<&'static str>) {
        let mut started = Vec::new();
        let mut stopped = Vec::new();
        for (index, (process, label)) in EXTERNAL_AGENTS.iter().enumerate() {
            let running = names.contains(*process);
            if enabled && running != self.running[index] {
                if running {
                    started.push(*label);
                } else {
                    stopped.push(*label);
                }
            }
            self.running[index] = running;
        }
        (started, stopped)
    }
}
fn poll_external_agents(
    app: &AppHandle,
    processes: &mut sysinfo::System,
    edges: &mut ExternalAgentEdges,
) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    // Only process names are needed. Reuse one snapshot in the existing five-second
    // monitor; avoid refreshing CPU, memory, executables, command lines or icons.
    let refreshed = processes.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::nothing(),
    );
    if refreshed == 0 {
        return;
    }
    let names = processes
        .processes()
        .values()
        .map(|process| process.name().to_string_lossy().trim().to_lowercase())
        .collect();
    let enabled = store(app, "agent-notification-enabled", json!(false)) == true;
    let (started, stopped) = edges.advance(&names, enabled);
    for (channel, names) in [
        ("external-agent:started", started),
        ("external-agent:stopped", stopped),
    ] {
        if !names.is_empty() {
            let _ = window.emit(
                "eisland-ipc",
                json!({"channel":channel,"args":[{"agentNames":names}]}),
            );
        }
    }
}
fn setting_path() -> PathBuf {
    usage::home().join(".claude/settings.json")
}
fn managed() -> bool {
    fs::read_to_string(setting_path()).is_ok_and(|s| s.contains(MARKER))
}
fn provider(channel: &str) -> &str {
    if channel.starts_with("codex:") {
        "codex"
    } else {
        "claude-code"
    }
}
fn data_key(provider: &str) -> String {
    if provider == "codex" {
        "codex-status-state".into()
    } else {
        "claude-code-status".into()
    }
}
fn blank(provider: &str) -> Value {
    json!({"revision":0,"enabled":provider=="codex"||managed(),"receiverRunning":if provider=="codex"{false}else{RUNNING.load(Ordering::Acquire)},"receiverUrl":if provider=="codex"{Value::Null}else{json!(format!("http://127.0.0.1:{PORT}/claude-code/hook"))},"settingsPath":if provider=="codex"{usage::home().join(".codex/sessions")}else{setting_path()},"hookScriptPath":if provider=="codex"{String::new()}else{std::env::current_exe().map(|v|v.to_string_lossy().into_owned()).unwrap_or_default()},"sessions":[],"events":[],"heatmap":{},"updatedAt":now()})
}
fn snapshot(app: &AppHandle, provider: &str) -> Value {
    let mut result = if provider == "codex" {
        store(app, "codex-status-snapshot", blank(provider))
    } else {
        store(app, "claude-code-status", blank(provider))
    };
    if !result.is_object() {
        result = blank(provider);
    }
    if provider == "codex" {
        result["enabled"] = json!(store(app, "codex-status-state", json!({}))["enabled"] != false);
    } else {
        result["enabled"] = json!(managed());
        result["receiverRunning"] = json!(RUNNING.load(Ordering::Acquire));
        result["receiverUrl"] = if RUNNING.load(Ordering::Acquire) {
            json!(format!("http://127.0.0.1:{PORT}/claude-code/hook"))
        } else {
            Value::Null
        };
        result["hookScriptPath"] = json!(std::env::current_exe()
            .map(|v| v.to_string_lossy().into_owned())
            .unwrap_or_default());
    }
    result
}
fn publish(app: &AppHandle, provider: &str, mut value: Value) -> Result<Value> {
    let previous = snapshot(app, provider);
    value["updatedAt"] = json!(now());
    value["revision"] = json!(previous["revision"].as_u64().unwrap_or(0) + 1);
    let key = if provider == "codex" {
        "codex-status-snapshot"
    } else {
        "claude-code-status"
    };
    save(app, key, &value)?;
    let mut delta = value.clone();
    let sessions = value["sessions"].as_array().cloned().unwrap_or_default();
    let events = value["events"].as_array().cloned().unwrap_or_default();
    delta["kind"] = json!("cli-delta");
    delta["baseRevision"] = previous["revision"].clone();
    delta["sessionIds"] = json!(sessions
        .iter()
        .map(|item| item["id"].clone())
        .collect::<Vec<_>>());
    delta["eventIds"] = json!(events
        .iter()
        .map(|item| item["id"].clone())
        .collect::<Vec<_>>());
    delta["sessions"] = json!(sessions
        .into_iter()
        .filter(|session| !previous["sessions"]
            .as_array()
            .is_some_and(|items| items.contains(session)))
        .collect::<Vec<_>>());
    delta["events"] = json!(events
        .into_iter()
        .filter(|event| !previous["events"]
            .as_array()
            .is_some_and(|items| items.contains(event)))
        .collect::<Vec<_>>());
    app.emit(
        "eisland-ipc",
        json!({"channel":format!("{provider}:status-updated"),"args":[delta]}),
    )
    .map_err(|e| e.to_string())?;
    Ok(value)
}
pub fn start(app: &AppHandle) {
    if STARTED.swap(true, Ordering::AcqRel) {
        return;
    }
    STOPPED.store(false, Ordering::Release);
    let app = app.clone();
    let monitor = app.clone();
    std::thread::spawn(move || {
        let mut processes = sysinfo::System::new();
        let mut external_agents = ExternalAgentEdges::default();
        while !STOPPED.load(Ordering::Acquire) {
            if store(&monitor, "codex-status-state", json!({}))["enabled"] != false {
                if let Err(error) = scan_codex(&monitor) {
                    eprintln!("[Codex] {error}");
                }
            }
            for _ in 0..50 {
                if STOPPED.load(Ordering::Acquire) {
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            if cfg!(windows) && !STOPPED.load(Ordering::Acquire) {
                poll_external_agents(&monitor, &mut processes, &mut external_agents);
            }
        }
    });
    std::thread::spawn(move || {
        let listener = match TcpListener::bind(("127.0.0.1", PORT)) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("[Claude hook] {error}");
                return;
            }
        };
        if listener.set_nonblocking(true).is_err() {
            return;
        }
        RUNNING.store(true, Ordering::Release);
        // Existing managed hooks are migrated in place; isolated smoke profiles must
        // never redirect the user's real Claude configuration to a test executable.
        if managed() && std::env::var_os("EISLAND_DATA_DIR").is_none() {
            if let Err(error) = install(true) {
                eprintln!("[Claude hook migration] {error}");
            }
        }
        while !STOPPED.load(Ordering::Acquire) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let Some(permit) = HookPermit::acquire() else {
                        continue;
                    };
                    let app = app.clone();
                    std::thread::spawn(move || {
                        let _permit = permit;
                        let _ = receive(&app, stream);
                    });
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(100))
                }
                Err(_) => break,
            }
        }
        RUNNING.store(false, Ordering::Release);
    });
}
pub fn stop() {
    STOPPED.store(true, Ordering::Release);
    PERMISSIONS
        .get_or_init(Default::default)
        .lock()
        .unwrap()
        .drain()
        .for_each(|(_, sender)| {
            let _ = sender.sender.send(String::new());
        });
}
fn hash(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}
fn details_path(app: &AppHandle, id: &str) -> PathBuf {
    app.state::<crate::infrastructure::storage::AppPaths>()
        .store_dir
        .join("cli-details")
        .join(format!("{}.txt", hash(id)))
}

fn phase(event: &Value) -> &str {
    match event["eventName"].as_str().unwrap_or("") {
        "PermissionRequest" => "waiting_permission",
        "SessionEnd" => "completed",
        "Stop" | "StopFailure" | "AssistantOutput" | "SessionStart" | "SubagentStart"
        | "SubagentStop" => "idle",
        _ => "running",
    }
}
fn kind(event: &str) -> &str {
    match event {
        "SessionStart" | "TurnStart" | "SubagentStart" | "PreCompact" => "session",
        "PermissionRequest" | "PermissionDenied" => "permission",
        "PreToolUse" | "PostToolUse" | "PostToolUseFailure" => "tool",
        "Stop" | "StopFailure" | "AssistantOutput" | "SessionEnd" | "SubagentStop" => "completed",
        "UserPromptSubmit" => "message",
        "Notification" => "notification",
        _ => "unknown",
    }
}
fn preview(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_owned)
        .unwrap_or_else(|| {
            if value.is_null() {
                String::new()
            } else {
                value.to_string()
            }
        })
        .chars()
        .take(256)
        .collect()
}
fn first_detail(payload: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        let value = &payload[*key];
        let text = if let Some(text) = value.as_str() {
            text.trim().to_owned()
        } else if value.is_null() {
            return None;
        } else {
            serde_json::to_string_pretty(value).ok()?
        };
        (!text.is_empty()).then_some(text)
    })
}
fn content_text(content: &Value) -> Option<String> {
    if let Some(text) = content.as_str() {
        return (!text.trim().is_empty()).then(|| text.trim().to_owned());
    }
    let text = content
        .as_array()?
        .iter()
        .filter_map(|block| {
            block.as_str().or_else(|| {
                (block["type"].as_str().unwrap_or("text") == "text")
                    .then(|| block["text"].as_str().or_else(|| block["content"].as_str()))
                    .flatten()
            })
        })
        .collect::<Vec<_>>()
        .join("\n");
    (!text.trim().is_empty()).then(|| text.trim().to_owned())
}
fn transcript_tail(path: &Path) -> Vec<Value> {
    let read = || -> std::io::Result<Vec<Value>> {
        let mut file = File::open(path)?;
        let start = file.metadata()?.len().saturating_sub(1024 * 1024);
        file.seek(SeekFrom::Start(start))?;
        let mut bytes = Vec::new();
        file.take(1024 * 1024).read_to_end(&mut bytes)?;
        let text = String::from_utf8_lossy(&bytes);
        let mut lines = text.lines().collect::<Vec<_>>();
        if start > 0 && !lines.is_empty() {
            lines.remove(0);
        }
        Ok(lines
            .into_iter()
            .rev()
            .take(260)
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect())
    };
    read().unwrap_or_default()
}
fn enrich_transcript_entries(payload: &mut Value, entries: &[Value]) {
    let expected_id = first_detail(payload, &["tool_use_id", "toolUseID", "toolUseId"]);
    let expected_name = first_detail(payload, &["tool_name", "toolName", "name"]);
    for entry in entries {
        if first_detail(payload, &["session_id", "sessionId"]).is_none() {
            if let Some(id) = first_detail(entry, &["sessionId", "session_id"]) {
                payload["session_id"] = json!(id);
            }
        }
        let message = if entry["message"].is_object() {
            &entry["message"]
        } else {
            entry
        };
        let content = &message["content"];
        let role = message["role"].as_str().unwrap_or("");
        let key = if role == "user" {
            "user_input"
        } else {
            "last_assistant_message"
        };
        if matches!(role, "user" | "assistant") && payload[key].is_null() {
            if let Some(text) = content_text(content) {
                payload[key] = json!(text);
            }
        }
        if role == "assistant" && payload["model"].is_null() && message["model"].is_string() {
            payload["model"] = message["model"].clone();
        }
        if let Some(blocks) = content.as_array() {
            for block in blocks.iter().rev() {
                if block["type"] == "tool_result"
                    && first_detail(
                        payload,
                        &[
                            "tool_response",
                            "toolResponse",
                            "response",
                            "result",
                            "output",
                        ],
                    )
                    .is_none()
                {
                    let id = block["tool_use_id"]
                        .as_str()
                        .or_else(|| block["toolUseId"].as_str());
                    if expected_id
                        .as_deref()
                        .is_none_or(|expected| Some(expected) == id)
                    {
                        payload["tool_response"] = block["content"].clone();
                        if expected_id.is_none() {
                            payload["tool_use_id"] = json!(id);
                        }
                    }
                }
                if block["type"] == "tool_use" && payload["tool_input"].is_null() {
                    let id = block["id"].as_str();
                    let name = block["name"].as_str();
                    let target = expected_id
                        .as_deref()
                        .or_else(|| payload["tool_use_id"].as_str());
                    if target.is_none_or(|expected| Some(expected) == id)
                        && expected_name
                            .as_deref()
                            .is_none_or(|expected| Some(expected) == name)
                    {
                        payload["tool_name"] = json!(name);
                        payload["tool_use_id"] = json!(id);
                        payload["tool_input"] = block["input"].clone();
                    }
                }
            }
        }
        if entry["type"] == "summary" && payload["last_assistant_message"].is_null() {
            payload["last_assistant_message"] = entry["summary"].clone();
        }
    }
}
fn enrich_claude_payload(payload: &mut Value) {
    let root = usage::home().join(".claude/projects");
    let Ok(root) = root.canonicalize() else {
        return;
    };
    let requested = first_detail(payload, &["transcript_path", "transcriptPath"]);
    let selected = requested
        .and_then(|path| PathBuf::from(path).canonicalize().ok())
        .filter(|path| {
            path.starts_with(&root)
                && path
                    .extension()
                    .is_some_and(|extension| extension == "jsonl")
        });
    let selected = selected.or_else(|| {
        let cwd = first_detail(payload, &["cwd", "project_dir", "projectDir"])?;
        let normalize = |value: &str| {
            value
                .replace('\\', "/")
                .trim_end_matches('/')
                .to_lowercase()
        };
        let cwd = normalize(&cwd);
        let deadline = std::time::Instant::now() + Duration::from_millis(650);
        let mut files = walkdir::WalkDir::new(&root)
            .into_iter()
            .filter_entry(|entry| entry.file_name() != "subagents")
            .take_while(|_| std::time::Instant::now() < deadline)
            .filter_map(std::result::Result::ok)
            .filter(|entry| {
                entry.file_type().is_file()
                    && entry
                        .path()
                        .extension()
                        .is_some_and(|extension| extension == "jsonl")
            })
            .take(240)
            .filter_map(|entry| Some((entry.metadata().ok()?.modified().ok()?, entry.into_path())))
            .collect::<Vec<_>>();
        files.sort_by_key(|(time, _)| std::cmp::Reverse(*time));
        files
            .into_iter()
            .take(80)
            .take_while(|_| std::time::Instant::now() < deadline)
            .find_map(|(_, path)| {
                transcript_tail(&path)
                    .iter()
                    .any(|entry| {
                        entry["cwd"]
                            .as_str()
                            .is_some_and(|value| normalize(value) == cwd)
                    })
                    .then_some(path)
            })
    });
    if let Some(path) = selected {
        payload["transcript_path"] = json!(path);
        enrich_transcript_entries(payload, &transcript_tail(&path));
    }
}
fn payload_event(
    payload: &Value,
    event_name: &str,
    session: &str,
    cwd: &Value,
    time: u64,
    id: &str,
) -> Value {
    let tool = payload["tool_name"]
        .as_str()
        .or_else(|| payload["toolName"].as_str())
        .or_else(|| payload["name"].as_str());
    let mut details = Vec::new();
    for (label, keys) in [
        (
            "userInput",
            &[
                "prompt",
                "user_prompt",
                "userPrompt",
                "user_input",
                "userInput",
            ][..],
        ),
        (
            "assistantOutput",
            &["last_assistant_message", "lastAssistantMessage"][..],
        ),
        ("toolUseId", &["tool_use_id", "toolUseID", "toolUseId"][..]),
        ("toolInput", &["tool_input", "toolInput"][..]),
        (
            "toolResult",
            &[
                "tool_response",
                "toolResponse",
                "response",
                "result",
                "output",
            ][..],
        ),
        ("model", &["model"][..]),
        ("notification", &["message", "title"][..]),
        (
            "eventSubtype",
            &["notification_type", "notificationType", "subtype"][..],
        ),
        ("error", &["error", "error_details", "errorDetails"][..]),
        (
            "reason",
            &["reason", "permission_decision", "permissionDecision"][..],
        ),
    ] {
        if let Some(text) = first_detail(payload, keys) {
            details.push(json!({"label":label,"value":text}));
        }
    }
    let summary = payload
        .get("prompt")
        .or_else(|| payload.get("text"))
        .or_else(|| payload.get("message"))
        .or_else(|| payload.get("tool_response"))
        .or_else(|| payload.get("last_assistant_message"))
        .map(preview)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            tool.map(|name| format!("{event_name}: {name}"))
                .unwrap_or_else(|| event_name.to_owned())
        });
    json!({"id":id,"eventName":event_name,"kind":kind(event_name),"sessionId":session,"cwd":cwd,"transcriptPath":payload.get("transcript_path").or_else(||payload.get("transcriptPath")).cloned().unwrap_or(Value::Null),"summary":summary,"detail":null,"detailItems":details,"detailProvider":"claude","detailRevision":0,"toolName":tool,"toolInputPreview":payload.get("tool_input").map(preview),"createdAt":time,"raw":{}})
}
fn push_event(snapshot: &mut Value, event: Value) {
    if !snapshot["events"].is_array() {
        snapshot["events"] = json!([]);
    }
    let events = snapshot["events"].as_array_mut().unwrap();
    events.insert(0, event.clone());
    events.truncate(120);
    let id = event["sessionId"].as_str().unwrap_or("claude-code");
    if !snapshot["sessions"].is_array() {
        snapshot["sessions"] = json!([]);
    }
    let sessions = snapshot["sessions"].as_array_mut().unwrap();
    let index=sessions.iter().position(|v|v["id"]==id).unwrap_or_else(||{sessions.push(json!({"id":id,"title":event["cwd"].as_str().and_then(|s|Path::new(s).file_name()).map(|v|v.to_string_lossy().into_owned()).unwrap_or_else(||id.to_owned()),"cwd":event["cwd"],"transcriptPath":event["transcriptPath"],"events":[]}));sessions.len()-1});
    let session = &mut sessions[index];
    session["phase"] = json!(phase(&event));
    session["lastSummary"] = event["summary"].clone();
    session["lastEventAt"] = event["createdAt"].clone();
    session["pendingPermission"] = if event["eventName"] == "PermissionRequest" {
        event.clone()
    } else {
        Value::Null
    };
    let events = session["events"].as_array_mut().unwrap();
    events.insert(0, event);
    events.truncate(40);
    sessions.sort_by_key(|v| std::cmp::Reverse(v["lastEventAt"].as_u64().unwrap_or(0)));
    sessions.truncate(1000);
}
const HOOK_BODY_LIMIT: usize = 2 * 1024 * 1024;
const HOOK_HEADER_LIMIT: usize = 16384;
const HOOK_LINE_LIMIT: usize = 8192;
const HOOK_IO_TIMEOUT: Duration = Duration::from_secs(5);

/// Hold a connection slot before starting a parser, including slow/incomplete headers.
struct HookPermit;
impl HookPermit {
    fn acquire() -> Option<Self> {
        let mut current = HOOK_REQUESTS.load(Ordering::Acquire);
        loop {
            if current >= 32 {
                return None;
            }
            match HOOK_REQUESTS.compare_exchange_weak(
                current,
                current + 1,
                Ordering::AcqRel,
                Ordering::Acquire,
            ) {
                Ok(_) => return Some(Self),
                Err(actual) => current = actual,
            }
        }
    }
}
impl Drop for HookPermit {
    fn drop(&mut self) {
        HOOK_REQUESTS.fetch_sub(1, Ordering::AcqRel);
    }
}

fn read_hook_payload(stream: &mut TcpStream, timeout: Duration) -> Result<Value> {
    let deadline = std::time::Instant::now() + timeout;
    let mut wire = Vec::with_capacity(4096);
    let (offset, length) = loop {
        let mut headers = vec![httparse::EMPTY_HEADER; 4096];
        let mut request = httparse::Request::new(&mut headers);
        match request
            .parse(&wire)
            .map_err(|error| format!("Invalid hook headers: {error}"))?
        {
            httparse::Status::Complete(offset) => {
                let method = request.method.unwrap_or("");
                let path = request.path.unwrap_or("");
                let line_bytes = method.len() + path.len() + 12;
                if line_bytes > HOOK_LINE_LIMIT
                    || offset.saturating_sub(line_bytes) > HOOK_HEADER_LIMIT
                {
                    return Err("Hook headers exceed limit".into());
                }
                if method != "POST" || path != "/claude-code/hook" || request.version != Some(1) {
                    return Err("Invalid hook endpoint".into());
                }
                let mut length = None;
                for header in request.headers.iter() {
                    if header.name.eq_ignore_ascii_case("Transfer-Encoding") {
                        return Err("Hook requests require Content-Length".into());
                    }
                    if header.name.eq_ignore_ascii_case("Content-Length") {
                        if length.is_some() {
                            return Err("Duplicate hook Content-Length".into());
                        }
                        let value = std::str::from_utf8(header.value)
                            .map_err(|error| error.to_string())?
                            .trim_matches([' ', '\t']);
                        if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
                            return Err("Invalid hook Content-Length".into());
                        }
                        length = Some(value.parse::<usize>().map_err(|error| error.to_string())?);
                    }
                }
                let length = length.unwrap_or(0);
                if length > HOOK_BODY_LIMIT {
                    return Err("Hook body exceeds 2 MiB".into());
                }
                break (offset, length);
            }
            httparse::Status::Partial => {
                if wire.len() >= HOOK_LINE_LIMIT + HOOK_HEADER_LIMIT {
                    return Err("Hook headers exceed limit".into());
                }
                read_hook_bytes(stream, &mut wire, deadline, 1024)?;
            }
        }
    };
    while wire.len() - offset < length {
        let remaining = length - (wire.len() - offset);
        read_hook_bytes(stream, &mut wire, deadline, remaining.min(16384))?;
    }
    let payload: Value = serde_json::from_slice(&wire[offset..offset + length])
        .map_err(|error| error.to_string())?;
    if !payload.is_object() {
        return Err("Hook payload must be an object".into());
    }
    Ok(payload)
}
fn read_hook_bytes(
    stream: &mut TcpStream,
    wire: &mut Vec<u8>,
    deadline: std::time::Instant,
    limit: usize,
) -> Result<()> {
    let remaining = deadline
        .checked_duration_since(std::time::Instant::now())
        .filter(|remaining| !remaining.is_zero())
        .ok_or("Hook request timed out")?;
    stream
        .set_read_timeout(Some(remaining))
        .map_err(|error| error.to_string())?;
    let mut bytes = vec![0; limit];
    let count = stream.read(&mut bytes).map_err(|error| error.to_string())?;
    if count == 0 {
        return Err("Incomplete hook request".into());
    }
    wire.extend_from_slice(&bytes[..count]);
    Ok(())
}
fn respond_hook(stream: &mut TcpStream, result: Result<String>) -> Result<()> {
    stream
        .set_write_timeout(Some(HOOK_IO_TIMEOUT))
        .map_err(|error| error.to_string())?;
    let (status, body) = match result {
        Ok(body) => (200, body),
        Err(error) => (400, json!({"ok":false,"error":error}).to_string()),
    };
    tiny_http::Response::from_string(body)
        .with_status_code(status)
        .with_header(tiny_http::Header::from_bytes("Content-Type", "application/json").unwrap())
        .with_header(tiny_http::Header::from_bytes("Connection", "close").unwrap())
        .raw_print(&mut *stream, tiny_http::HTTPVersion(1, 1), &[], false, None)
        .map_err(|error| error.to_string())?;
    stream.flush().map_err(|error| error.to_string())
}
fn receive(app: &AppHandle, mut stream: TcpStream) -> Result<()> {
    let result = read_hook_payload(&mut stream, HOOK_IO_TIMEOUT)
        .and_then(|payload| receive_payload(app, payload));
    respond_hook(&mut stream, result)
}
fn receive_payload(app: &AppHandle, mut payload: Value) -> Result<String> {
    for key in [
        "cwd",
        "transcript_path",
        "transcriptPath",
        "tool_name",
        "toolName",
        "name",
    ] {
        if payload[key]
            .as_str()
            .is_some_and(|value| value.len() > 4096)
        {
            return Err("Hook metadata exceeds limit".into());
        }
    }
    enrich_claude_payload(&mut payload);
    let event_name = payload["hook_event_name"]
        .as_str()
        .or_else(|| payload["eventName"].as_str())
        .unwrap_or("Unknown");
    if event_name.len() > 128 {
        return Err("Invalid hook event".into());
    }
    let session = payload["session_id"]
        .as_str()
        .or_else(|| payload["sessionId"].as_str())
        .or_else(|| payload["transcript_path"].as_str())
        .unwrap_or("claude-code");
    if session.len() > 2048 {
        return Err("Invalid session ID".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let time = now();
    let mut event = payload_event(&payload, event_name, session, &payload["cwd"], time, &id);
    let details = details_path(app, &id);
    fs::create_dir_all(details.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(
        details,
        serde_json::to_vec_pretty(&json!({"details":event["detailItems"],"raw":payload}))
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    if let Some(items) = event["detailItems"].as_array_mut() {
        for item in items {
            item["value"] = json!(preview(&item["value"]));
        }
    }
    let (sender, receiver) = mpsc::channel();
    let permission = event_name == "PermissionRequest";
    let guard = CLAUDE_EVENTS.lock().unwrap();
    if permission {
        if let Some(old) = PERMISSIONS
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .insert(
                session.to_owned(),
                Permission {
                    id: id.clone(),
                    sender,
                },
            )
        {
            let _ = old.sender.send(String::new());
        }
    }
    let mut current = snapshot(app, "claude-code");
    push_event(&mut current, event);
    let date = chrono::Local::now().format("%Y-%-m-%-d").to_string();
    let field = match event_name {
        "SessionStart" => Some("session"),
        "PreToolUse" => Some("tool"),
        "UserPromptSubmit" => Some("prompt"),
        _ => None,
    };
    if let Some(field) = field {
        if !current["heatmap"].is_object() {
            current["heatmap"] = json!({});
        }
        if !current["heatmap"][&date].is_object() {
            current["heatmap"][&date] = json!({"session":0,"tool":0,"prompt":0});
        }
        let count = current["heatmap"][&date][field].as_u64().unwrap_or(0) + 1;
        current["heatmap"][&date][field] = json!(count);
    }
    publish(app, "claude-code", current)?;
    drop(guard);
    let decision = if permission {
        receiver
            .recv_timeout(Duration::from_secs(600))
            .unwrap_or_default()
    } else {
        String::new()
    };
    if permission {
        PERMISSIONS
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .retain(|session_id, pending| session_id != session || pending.id != id);
        let _guard = CLAUDE_EVENTS.lock().unwrap();
        let mut current = snapshot(app, "claude-code");
        let mut changed = false;
        if let Some(sessions) = current["sessions"].as_array_mut() {
            for item in sessions {
                if item["id"] == session && item["pendingPermission"]["id"] == id {
                    item["pendingPermission"] = Value::Null;
                    item["phase"] = json!(if decision.is_empty() {
                        "idle"
                    } else {
                        "running"
                    });
                    changed = true;
                }
            }
        }
        if changed {
            publish(app, "claude-code", current)?;
        }
    }
    Ok(json!({"ok":true,"decision":decision}).to_string())
}

fn remove_managed(groups: &Value) -> Vec<Value> {
    groups
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|mut group| {
            let hooks = group["hooks"]
                .as_array()?
                .iter()
                .filter(|hook| !hook["command"].as_str().unwrap_or("").contains(MARKER))
                .cloned()
                .collect::<Vec<_>>();
            if hooks.is_empty() {
                None
            } else {
                group["hooks"] = json!(hooks);
                Some(group)
            }
        })
        .collect()
}
fn install(enabled: bool) -> Result<()> {
    let path = setting_path();
    let mut config = match fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => json!({}),
        Err(error) => return Err(error.to_string()),
    };
    if !config.is_object() {
        return Err("Claude settings must be an object".into());
    }
    if !config["hooks"].is_object() {
        config["hooks"] = json!({});
    }
    let hooks = config["hooks"].as_object_mut().unwrap();
    for groups in hooks.values_mut() {
        *groups = json!(remove_managed(groups));
    }
    hooks.retain(|_, groups| groups.as_array().is_some_and(|groups| !groups.is_empty()));
    if enabled {
        if !RUNNING.load(Ordering::Acquire) {
            return Err("Claude hook receiver is not running".into());
        }
        let exe = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        for event in HOOKS {
            let command = format!(
                "'{}' --eisland-claude-hook '{event}' # {MARKER}",
                exe.replace('\'', "'\"'\"'")
            );
            let mut group = json!({"hooks":[{"type":"command","command":command,"timeout":if *event=="PermissionRequest"{86400}else{10}}]});
            if matches!(
                *event,
                "PreToolUse"
                    | "PostToolUse"
                    | "PostToolUseFailure"
                    | "PermissionRequest"
                    | "PermissionDenied"
            ) {
                group["matcher"] = json!("*");
            }
            let entry = hooks
                .entry((*event).to_owned())
                .or_insert_with(|| json!([]));
            entry
                .as_array_mut()
                .ok_or("Invalid Claude hook group")?
                .push(group);
        }
    }
    if hooks.is_empty() {
        config.as_object_mut().unwrap().remove("hooks");
    }
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let temp = path.with_extension("json.eisland-tmp");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let provider = provider(channel);
    let operation = channel.split_once(':').map(|(_, v)| v).unwrap_or("");
    match operation {
        "status:get" => Ok(snapshot(app, provider)),
        "monitor:enable" | "monitor:disable" => {
            let enabled = operation.ends_with("enable");
            let mut state = store(app, &data_key(provider), json!({}));
            state["enabled"] = json!(enabled);
            save(app, &data_key(provider), &state)?;
            if enabled {
                scan_codex(app)?;
            }
            let mut snapshot = snapshot(app, provider);
            snapshot["enabled"] = json!(enabled);
            snapshot["receiverRunning"] = json!(enabled);
            Ok(
                json!({"ok":true,"message":if enabled{"Codex monitor enabled"}else{"Codex monitor disabled"},"snapshot":publish(app,provider,snapshot)?}),
            )
        }
        "hook:install" | "hook:uninstall" => {
            let enabled = operation.ends_with("install") && !operation.ends_with("uninstall");
            let result = install(enabled);
            let current = publish(app, provider, snapshot(app, provider))?;
            Ok(
                json!({"ok":result.is_ok(),"message":result.err().unwrap_or_else(||if enabled{"Claude hook enabled".into()}else{"Claude hook disabled".into()}),"snapshot":current}),
            )
        }
        "events:clear" | "sessions:delete" => {
            let ids = args
                .first()
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            if provider == "codex" {
                let mut state = store(app, "codex-status-state", json!({}));
                if operation == "events:clear" {
                    state["clearBefore"] = json!(now());
                    state["deletedBeforeBySession"] = json!({});
                } else {
                    if !state["deletedBeforeBySession"].is_object() {
                        state["deletedBeforeBySession"] = json!({});
                    }
                    for id in &ids {
                        if let Some(id) = id.as_str() {
                            state["deletedBeforeBySession"][id] = json!(now());
                        }
                    }
                }
                save(app, "codex-status-state", &state)?;
                scan_codex(app)?;
                return Ok(snapshot(app, provider));
            }
            let _guard = CLAUDE_EVENTS.lock().unwrap();
            let mut current = snapshot(app, provider);
            for field in ["sessions", "events"] {
                let kept = current[field]
                    .as_array()
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .filter(|item| {
                        operation != "events:clear"
                            && !ids.contains(
                                &item[if field == "sessions" {
                                    "id"
                                } else {
                                    "sessionId"
                                }],
                            )
                    })
                    .collect::<Vec<_>>();
                current[field] = json!(kept);
            }
            let mut permissions = PERMISSIONS.get_or_init(Default::default).lock().unwrap();
            permissions.retain(|id, sender| {
                if operation == "events:clear" || ids.contains(&json!(id)) {
                    let _ = sender.sender.send(String::new());
                    false
                } else {
                    true
                }
            });
            drop(permissions);
            publish(app, provider, current)
        }
        "permission:resolve" => {
            let _guard = CLAUDE_EVENTS.lock().unwrap();
            let session = args
                .first()
                .and_then(Value::as_str)
                .ok_or("Session ID is required")?;
            let decision = args
                .get(1)
                .and_then(Value::as_str)
                .filter(|v| matches!(*v, "allow" | "always" | "deny"))
                .ok_or("Invalid permission decision")?;
            let sender = PERMISSIONS
                .get_or_init(Default::default)
                .lock()
                .unwrap()
                .remove(session)
                .ok_or("Permission request is no longer pending")?;
            sender
                .sender
                .send(decision.to_owned())
                .map_err(|e| e.to_string())?;
            let mut current = snapshot(app, provider);
            if let Some(sessions) = current["sessions"].as_array_mut() {
                for item in sessions {
                    if item["id"] == session {
                        item["pendingPermission"] = Value::Null;
                        item["phase"] = json!("running");
                    }
                }
            }
            publish(app, provider, current)
        }
        "event:detail" => {
            let id = args
                .first()
                .and_then(Value::as_str)
                .ok_or("Event ID is required")?;
            detail(
                app,
                provider,
                id,
                args.get(1).and_then(Value::as_u64).unwrap_or(0),
            )
        }
        _ => Err(format!("Unknown CLI status operation: {channel}")),
    }
}
fn detail(app: &AppHandle, provider: &str, id: &str, offset: u64) -> Result<Value> {
    let current = snapshot(app, provider);
    let event = current["events"]
        .as_array()
        .and_then(|items| items.iter().find(|v| v["id"] == id))
        .or_else(|| {
            current["sessions"].as_array().and_then(|sessions| {
                sessions
                    .iter()
                    .filter_map(|s| s["events"].as_array())
                    .flatten()
                    .find(|v| v["id"] == id)
            })
        })
        .ok_or("CLI event is no longer available")?;
    let codex = event["detailProvider"] == "codex";
    let path = if codex {
        PathBuf::from(
            event["transcriptPath"]
                .as_str()
                .ok_or("Missing transcript")?,
        )
    } else {
        details_path(app, id)
    };
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let total = if codex {
        event["detailSource"]["bytes"].as_u64().unwrap_or(0)
    } else {
        file.metadata().map_err(|e| e.to_string())?.len()
    };
    let start = offset.min(total);
    let base = if codex {
        event["detailSource"]["offset"].as_u64().unwrap_or(0)
    } else {
        0
    };
    file.seek(SeekFrom::Start(base + start))
        .map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.take((total - start).min(65540))
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    let mut length = bytes.len().min(65536);
    while length > 0 && length < bytes.len() && bytes[length] & 0xc0 == 0x80 {
        length -= 1;
    }
    let next = start + length as u64;
    Ok(
        json!({"text":String::from_utf8_lossy(&bytes[..length]),"offset":start,"nextOffset":if next<total&&length>0{Some(next)}else{None},"totalBytes":total}),
    )
}
fn codex_event(
    value: &Value,
    path: &Path,
    offset: u64,
    bytes: usize,
    log: &mut Log,
) -> Option<Value> {
    let payload = &value["payload"];
    let kind = value["type"].as_str().unwrap_or("");
    let time = usage::timestamp(&value["timestamp"]);
    if kind == "session_meta" {
        log.id = payload["id"].as_str().unwrap_or(&log.id).to_owned();
        log.cwd = payload["cwd"].clone();
    }
    if kind == "turn_context" {
        if payload["cwd"].is_string() {
            log.cwd = payload["cwd"].clone();
        }
        return None;
    }
    let sub = payload["type"].as_str().unwrap_or("");
    let name = if kind == "session_meta" {
        "SessionStart"
    } else if kind == "event_msg" {
        match sub {
            "task_started" => "TurnStart",
            "task_complete" => "Stop",
            "turn_aborted" => "StopFailure",
            "user_message" => "UserPromptSubmit",
            "agent_message" => "AssistantOutput",
            "exec_approval_request" | "apply_patch_approval_request" => "PermissionRequest",
            _ => return None,
        }
    } else if kind == "response_item" {
        match sub {
            "function_call" | "custom_tool_call" | "local_shell_call" => "PreToolUse",
            "function_call_output" | "custom_tool_call_output" => "PostToolUse",
            "message" => {
                if payload["role"] == "user" {
                    "UserPromptSubmit"
                } else if payload["role"] == "assistant" {
                    "AssistantOutput"
                } else {
                    return None;
                }
            }
            _ => return None,
        }
    } else {
        return None;
    };
    let id = format!("codex:{}:{offset}", hash(&path.to_string_lossy()));
    let mut normalized = payload.clone();
    let text = payload
        .get("message")
        .or_else(|| payload.get("text"))
        .map(preview)
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| {
            payload["content"]
                .as_array()
                .map(|blocks| {
                    blocks
                        .iter()
                        .filter_map(|block| block["text"].as_str())
                        .collect::<Vec<_>>()
                        .join("\n")
                })
                .unwrap_or_default()
        });
    normalized["text"] = json!(text);
    let mut event = payload_event(&normalized, name, &log.id, &log.cwd, time, &id);
    event["detailProvider"] = json!("codex");
    event["transcriptPath"] = json!(path);
    event["detailSource"] = json!({"offset":offset,"bytes":bytes});
    if let Some(previous) = log.events.iter().position(|item| {
        item["eventName"] == event["eventName"]
            && item["summary"] == event["summary"]
            && item["toolName"] == event["toolName"]
            && time >= item["createdAt"].as_u64().unwrap_or(0)
            && time - item["createdAt"].as_u64().unwrap_or(0) <= 250
    }) {
        let previous = log.events[previous].clone();
        if previous["createdAt"].as_u64() == Some(time) {
            return None;
        }
        log.events.retain(|item| item["id"] != previous["id"]);
        if let Some(date) = chrono::DateTime::from_timestamp_millis(
            previous["createdAt"].as_u64().unwrap_or(0) as i64,
        ) {
            let key = date
                .with_timezone(&chrono::Local)
                .format("%Y-%-m-%-d")
                .to_string();
            let field = match previous["eventName"].as_str().unwrap_or("") {
                "SessionStart" => "session",
                "PreToolUse" => "tool",
                "UserPromptSubmit" => "prompt",
                _ => "",
            };
            if let Some(counts) = log.heatmap.get_mut(&key) {
                if !field.is_empty() {
                    counts[field] = json!(counts[field].as_u64().unwrap_or(0).saturating_sub(1));
                }
            }
        }
    }
    let date = chrono::DateTime::from_timestamp_millis(time as i64)?
        .with_timezone(&chrono::Local)
        .format("%Y-%-m-%-d")
        .to_string();
    let field = match name {
        "SessionStart" => "session",
        "PreToolUse" => "tool",
        "UserPromptSubmit" => "prompt",
        _ => "",
    };
    if !field.is_empty() {
        let entry = log
            .heatmap
            .entry(date)
            .or_insert_with(|| json!({"session":0,"tool":0,"prompt":0}));
        entry[field] = json!(entry[field].as_u64().unwrap_or(0) + 1);
    }
    Some(event)
}
fn scan_codex(app: &AppHandle) -> Result<()> {
    let root = usage::home().join(".codex/sessions");
    let mut paths = walkdir::WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(|v| v.ok())
        .filter(|v| v.file_type().is_file() && v.path().extension().is_some_and(|v| v == "jsonl"))
        .map(|v| v.into_path())
        .collect::<Vec<_>>();
    paths.sort_by_key(|path| {
        std::cmp::Reverse(
            fs::metadata(path)
                .and_then(|m| m.modified())
                .unwrap_or(UNIX_EPOCH),
        )
    });
    paths.truncate(1000);
    let mut logs = LOGS.get_or_init(Default::default).lock().unwrap();
    logs.retain(|path, _| paths.contains(path));
    let mut dirty = false;
    for path in paths {
        let Ok(mut file) = File::open(&path) else {
            continue;
        };
        let Ok(meta) = file.metadata() else {
            continue;
        };
        let log = logs.entry(path.clone()).or_insert_with(|| Log {
            id: path
                .file_stem()
                .map(|v| v.to_string_lossy().into_owned())
                .unwrap_or_default(),
            ..Log::default()
        });
        if meta.len() < log.offset {
            *log = Log {
                id: log.id.clone(),
                ..Log::default()
            };
        }
        if meta.len() == log.offset {
            continue;
        }
        file.seek(SeekFrom::Start(log.offset))
            .map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(file);
        let mut line = Vec::new();
        loop {
            let (bytes, complete) = usage::read_log_line(&mut reader, &mut line)?;
            if bytes == 0 || !complete {
                break;
            }
            if bytes <= 8 * 1024 * 1024 {
                if let Ok(value) = serde_json::from_slice::<Value>(&line) {
                    if let Some(event) = codex_event(&value, &path, log.offset, bytes, log) {
                        log.events.insert(0, event);
                        log.events.truncate(40);
                        dirty = true;
                    }
                }
            }
            log.offset += bytes as u64;
        }
    }
    let state = store(app, "codex-status-state", json!({}));
    let mut current = blank("codex");
    current["receiverRunning"] = json!(state["enabled"] != false);
    current["enabled"] = json!(state["enabled"] != false);
    let cutoff = state["clearBefore"].as_u64().unwrap_or(0);
    let mut events = Vec::new();
    let mut sessions = Vec::new();
    let mut heatmap = json!({});
    for log in logs.values() {
        let deleted = state["deletedBeforeBySession"][&log.id]
            .as_u64()
            .unwrap_or(0);
        let visible = log
            .events
            .iter()
            .filter(|event| event["createdAt"].as_u64().unwrap_or(0) > cutoff.max(deleted))
            .collect::<Vec<_>>();
        if let Some(latest) = visible.first() {
            let phase = if now().saturating_sub(latest["createdAt"].as_u64().unwrap_or(0)) > 600000
            {
                "completed"
            } else {
                phase(latest)
            };
            sessions.push(json!({"id":log.id,"title":log.cwd.as_str().and_then(|v|Path::new(v).file_name()).map(|v|v.to_string_lossy().into_owned()).unwrap_or_else(||log.id.clone()),"phase":phase,"cwd":log.cwd,"transcriptPath":latest["transcriptPath"],"lastSummary":latest["summary"],"lastEventAt":latest["createdAt"],"pendingPermission":if phase=="waiting_permission"{(**latest).clone()}else{Value::Null},"events":visible}));
            events.extend(visible);
        }
        for (date, counts) in &log.heatmap {
            if !heatmap[date].is_object() {
                heatmap[date] = json!({"session":0,"tool":0,"prompt":0});
            }
            for field in ["session", "tool", "prompt"] {
                heatmap[date][field] = json!(
                    heatmap[date][field].as_u64().unwrap_or(0)
                        + counts[field].as_u64().unwrap_or(0)
                );
            }
        }
    }
    sessions.sort_by_key(|session| std::cmp::Reverse(session["lastEventAt"].as_u64().unwrap_or(0)));
    events.sort_by_key(|event| std::cmp::Reverse(event["createdAt"].as_u64().unwrap_or(0)));
    events.truncate(120);
    current["sessions"] = json!(sessions);
    current["events"] = json!(events);
    current["heatmap"] = heatmap;
    drop(logs);
    let old = snapshot(app, "codex");
    if dirty
        || old["events"] != current["events"]
        || old["sessions"] != current["sessions"]
        || old["heatmap"] != current["heatmap"]
    {
        publish(app, "codex", current)?;
    }
    Ok(())
}
pub fn run_hook_cli() -> bool {
    let arguments = std::env::args().collect::<Vec<_>>();
    let Some(index) = arguments.iter().position(|v| v == "--eisland-claude-hook") else {
        return false;
    };
    let run = || -> Result<()> {
        let mut body = String::new();
        std::io::stdin()
            .take(2 * 1024 * 1024 + 1)
            .read_to_string(&mut body)
            .map_err(|e| e.to_string())?;
        if body.len() > 2 * 1024 * 1024 {
            return Err("Hook payload too large".into());
        }
        let mut payload: Value = serde_json::from_str(&body).unwrap_or_else(|_| json!({}));
        if !payload.is_object() {
            payload = json!({});
        }
        let event = arguments
            .get(index + 1)
            .map(String::as_str)
            .unwrap_or("Unknown");
        payload["hook_event_name"] = json!(event);
        if !payload["cwd"].is_string() {
            payload["cwd"] = json!(std::env::current_dir().map_err(|e| e.to_string())?);
        }
        let mut response = crate::infrastructure::http::blocking_loopback_client()?
            .post(format!("http://127.0.0.1:{PORT}/claude-code/hook"))
            .timeout(Duration::from_secs(if event == "PermissionRequest" {
                605
            } else {
                2
            }))
            .json(&payload)
            .send()
            .map_err(|error| error.to_string())?
            .error_for_status()
            .map_err(|error| error.to_string())?;
        let response = crate::infrastructure::http::bounded_blocking(&mut response, 65536)?;
        if event == "PermissionRequest" {
            let value: Value =
                serde_json::from_slice(&response).map_err(|error| error.to_string())?;
            let decision = value["decision"].as_str().unwrap_or("");
            if matches!(decision, "allow" | "always" | "deny") {
                println!(
                    "{}",
                    json!({"continue":true,"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":if decision=="deny"{json!({"behavior":"deny","message":"User denied the permission request","interrupt":false})}else{json!({"behavior":"allow"})}}})
                );
            }
        }
        Ok(())
    };
    let _ = run();
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    fn hook_wire(wire: &[u8], close_write: bool, timeout: Duration) -> Result<Value> {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let worker = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            read_hook_payload(&mut socket, timeout)
        });
        let mut socket = TcpStream::connect(address).unwrap();
        socket.write_all(wire).unwrap();
        if close_write {
            socket.shutdown(std::net::Shutdown::Write).unwrap();
        }
        let result = worker.join().unwrap();
        drop(socket);
        result
    }
    #[test]
    fn hook_http_library_retains_endpoint_framing_and_body_limits() {
        let raw =
            "POST /claude-code/hook HTTP/1.1\r\nHost: localhost\r\nContent-Length: 2\r\n\r\n{}";
        assert_eq!(
            hook_wire(raw.as_bytes(), true, HOOK_IO_TIMEOUT).unwrap(),
            json!({})
        );
        for raw in [
            "GET /claude-code/hook HTTP/1.1\r\nContent-Length: 2\r\n\r\n{}",
            "POST /wrong HTTP/1.1\r\nContent-Length: 2\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.0\r\nContent-Length: 2\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 2\r\nContent-Length: 2\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: +2\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: -1\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 1,2\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 2097153\r\n\r\n",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 9\r\n\r\n{}",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 2\r\n\r\n[]",
        ] {
            assert!(
                hook_wire(raw.as_bytes(), true, HOOK_IO_TIMEOUT).is_err(),
                "{raw}"
            );
        }
        let headers = format!(
            "POST /claude-code/hook HTTP/1.1\r\nX-Fill: {}\r\nContent-Length: 2\r\n\r\n{{}}",
            "x".repeat(HOOK_HEADER_LIMIT)
        );
        assert!(hook_wire(headers.as_bytes(), true, HOOK_IO_TIMEOUT)
            .unwrap_err()
            .contains("limit"));
    }
    #[test]
    fn incomplete_hook_headers_and_bodies_time_out_without_unbounded_parser_threads() {
        for raw in [
            "POST /claude-code/",
            "POST /claude-code/hook HTTP/1.1\r\nContent-Length: 2\r\n\r\n{",
        ] {
            let started = std::time::Instant::now();
            assert!(hook_wire(raw.as_bytes(), false, Duration::from_millis(100)).is_err());
            assert!(started.elapsed() < Duration::from_secs(3));
        }
    }
    #[test]
    fn hook_connections_reserve_one_of_32_slots_before_parsing_and_release_on_drop() {
        let mut guards = (0..32)
            .map(|_| HookPermit::acquire().unwrap())
            .collect::<Vec<_>>();
        assert!(HookPermit::acquire().is_none());
        drop(guards.pop());
        assert!(HookPermit::acquire().is_some());
        drop(guards);
        assert_eq!(HOOK_REQUESTS.load(Ordering::Acquire), 0);
    }
    #[test]
    fn hook_responses_use_library_serialization_with_utf8_lengths_and_errors() {
        for success in [true, false] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let address = listener.local_addr().unwrap();
            let worker = std::thread::spawn(move || {
                let (mut socket, _) = listener.accept().unwrap();
                let payload = read_hook_payload(&mut socket, HOOK_IO_TIMEOUT).unwrap();
                assert_eq!(payload["text"], "中文😀");
                respond_hook(
                    &mut socket,
                    if success {
                        Ok(json!({"ok":true,"decision":"允许😀"}).to_string())
                    } else {
                        Err("fixture rejected".into())
                    },
                )
                .unwrap();
            });
            let response = crate::infrastructure::http::blocking_loopback_client()
                .unwrap()
                .post(format!("http://{address}/claude-code/hook"))
                .timeout(Duration::from_secs(3))
                .json(&json!({"text":"中文😀"}))
                .send()
                .unwrap();
            assert_eq!(response.status().as_u16(), if success { 200 } else { 400 });
            assert_eq!(response.headers()["content-type"], "application/json");
            let value: Value = response.json().unwrap();
            assert_eq!(value["ok"], success);
            if success {
                assert_eq!(value["decision"], "允许😀");
            }
            worker.join().unwrap();
        }
    }
    #[test]
    fn external_agents_notify_initial_and_restart_edges_once() {
        let mut edges = ExternalAgentEdges::default();
        let names = HashSet::from(["claude.exe".to_owned(), "codex.exe".to_owned()]);
        assert_eq!(
            edges.advance(&names, true),
            (vec!["Claude Code", "Codex"], vec![])
        );
        assert_eq!(edges.advance(&names, true), (vec![], vec![]));
        assert_eq!(
            edges.advance(&HashSet::new(), true),
            (vec![], vec!["Claude Code", "Codex"])
        );
        assert_eq!(
            edges.advance(&names, true),
            (vec!["Claude Code", "Codex"], vec![])
        );
    }
    #[test]
    fn external_agent_notifications_respect_disabled_edges_without_replay() {
        let mut edges = ExternalAgentEdges::default();
        let names = HashSet::from(["cursor.exe".to_owned()]);
        assert_eq!(edges.advance(&names, false), (vec![], vec![]));
        assert_eq!(edges.advance(&names, true), (vec![], vec![]));
        assert_eq!(edges.advance(&HashSet::new(), false), (vec![], vec![]));
        assert_eq!(edges.advance(&names, true), (vec!["Cursor"], vec![]));
    }
    #[test]
    fn removing_managed_hooks_preserves_user_commands() {
        let groups = json!([{"hooks":[{"command":"user"},{"command":format!("exe # {MARKER}")}]}]);
        let result = remove_managed(&groups);
        assert_eq!(result[0]["hooks"], json!([{"command":"user"}]));
    }
    #[test]
    fn claude_transcript_details_match_the_hook_tool() {
        let mut payload = json!({"tool_name":"Read","tool_use_id":"wanted"});
        let entries = vec![
            json!({"sessionId":"s","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"other","content":"wrong"},{"type":"tool_result","tool_use_id":"wanted","content":"contents"}]}}),
            json!({"message":{"role":"assistant","model":"claude","content":[{"type":"text","text":"answer"},{"type":"tool_use","id":"wanted","name":"Read","input":{"file_path":"a.txt"}}]}}),
            json!({"message":{"role":"user","content":"question"}}),
        ];
        enrich_transcript_entries(&mut payload, &entries);
        assert_eq!(payload["tool_response"], "contents");
        assert_eq!(payload["tool_input"]["file_path"], "a.txt");
        assert_eq!(payload["user_input"], "question");
        assert_eq!(payload["last_assistant_message"], "answer");
        assert_eq!(payload["session_id"], "s");
        let event = payload_event(&payload, "PostToolUse", "s", &Value::Null, 1, "id");
        assert!(event["detailItems"]
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["label"] == "toolResult" && item["value"] == "contents"));
    }
    #[test]
    fn codex_events_preserve_byte_ranges_for_bounded_detail_reads() {
        let mut log = Log {
            id: "session".into(),
            ..Log::default()
        };
        let event=codex_event(&json!({"timestamp":"2026-11-04T12:00:00Z","type":"event_msg","payload":{"type":"user_message","message":"hello"}}),Path::new("log.jsonl"),123,82,&mut log).unwrap();
        assert_eq!(event["detailSource"], json!({"offset":123,"bytes":82}));
        assert_eq!(event["summary"], "hello");
    }
}
