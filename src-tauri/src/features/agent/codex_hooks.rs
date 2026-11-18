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

//! Codex lifecycle hooks and the merged view of hooks and rollout history.
use super::{
    blank, details_path, now, payload_event, preview, publish, snapshot, store, AppHandle, Result,
    RUNNING,
};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::{atomic::Ordering, Mutex},
};
use tauri::Manager;

pub(super) const SWITCH: &str = "--eisland-codex-hook";
pub(super) const ENDPOINT: &str = "/codex/hook";
pub(super) const STATE: &str = "codex-status-state";
const HISTORY: &str = "codex-hook-events";
const EVENTS: &[&str] = &[
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "Stop",
    "Interrupt",
];
const STALE_MS: u64 = 600_000;
const CORRELATION_MS: u64 = 5_000;
const HISTORY_LIMIT: usize = 600;

pub(super) struct LogView {
    pub sessions: Vec<Value>,
    pub heatmap: Value,
}

pub(super) static LOG_VIEW: Mutex<Option<LogView>> = Mutex::new(None);

pub(super) fn home() -> PathBuf {
    std::env::var_os("CODEX_HOME")
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| super::usage::home().join(".codex"))
}

pub(super) fn settings_path() -> PathBuf {
    home().join("hooks.json")
}

fn read_config(path: &Path) -> Result<Value> {
    match fs::read_to_string(path) {
        Ok(text) => {
            serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|e| e.to_string())
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(error) => Err(error.to_string()),
    }
}

fn is_managed(handler: &Value) -> bool {
    ["command", "commandWindows", "command_windows"]
        .iter()
        .any(|field| {
            handler[field].as_str().is_some_and(|command| {
                command
                    .strip_suffix(SWITCH)
                    .is_some_and(|prefix| prefix.ends_with(' '))
            })
        })
}

pub(super) fn configured() -> bool {
    read_config(&settings_path()).is_ok_and(|config| {
        config["hooks"]
            .as_object()
            .into_iter()
            .flatten()
            .any(|(_, groups)| {
                array(groups)
                    .iter()
                    .any(|group| array(&group["hooks"]).iter().any(is_managed))
            })
    })
}

fn configure(config: &mut Value, exe: Option<&Path>) -> Result<()> {
    let root = config
        .as_object_mut()
        .ok_or("Codex hooks config must be an object")?;
    if exe.is_none() && !root.contains_key("hooks") {
        return Ok(());
    }
    let hooks = root
        .entry("hooks")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("Codex hooks must be an object")?;
    hooks.retain(|_, groups| {
        let Some(groups) = groups.as_array_mut() else {
            return true;
        };
        let before = groups.len();
        groups.retain_mut(|group| {
            let Some(handlers) = group["hooks"].as_array_mut() else {
                return true;
            };
            let before = handlers.len();
            handlers.retain(|handler| !is_managed(handler));
            before == handlers.len() || !handlers.is_empty()
        });
        before == groups.len() || !groups.is_empty()
    });
    if let Some(exe) = exe {
        let exe = exe.to_str().ok_or("Invalid eIsland executable path")?;
        let command = if cfg!(windows) {
            format!("& '{}' {SWITCH}", exe.replace('\'', "''"))
        } else {
            format!("'{}' {SWITCH}", exe.replace('\'', "'\"'\"'"))
        };
        for event in EVENTS {
            let mut group =
                json!({"hooks": [{"type": "command", "command": command, "timeout": 3}]});
            if *event == "SessionStart" {
                group["matcher"] = json!("startup|resume|clear|fork");
            }
            hooks
                .entry(*event)
                .or_insert_with(|| json!([]))
                .as_array_mut()
                .ok_or("Invalid Codex hook group")?
                .push(group);
        }
    }
    if hooks.is_empty() {
        root.remove("hooks");
    }
    Ok(())
}

pub(super) fn install(enabled: bool) -> Result<()> {
    if enabled && !RUNNING.load(Ordering::Acquire) {
        return Err("Codex hook receiver is not running".into());
    }
    let path = settings_path();
    let previous = read_config(&path)?;
    let mut config = previous.clone();
    let exe = enabled
        .then(std::env::current_exe)
        .transpose()
        .map_err(|e| e.to_string())?;
    configure(&mut config, exe.as_deref())?;
    if config != previous {
        crate::infrastructure::storage::Store::new(path.parent().unwrap().to_path_buf())
            .write("hooks", &config)?;
    }
    Ok(())
}

fn array(value: &Value) -> &[Value] {
    value.as_array().map_or(&[], Vec::as_slice)
}

fn timestamp(event: &Value) -> u64 {
    event["createdAt"].as_u64().unwrap_or_default()
}

fn same_id(a: &Value, b: &Value, field: &str) -> bool {
    a[field]
        .as_str()
        .is_some_and(|id| !id.is_empty() && b[field] == id)
}

fn equivalent(hook: &Value, log: &Value) -> bool {
    let same_turn = same_id(hook, log, "turnId");
    let near = (hook["turnId"].is_null() || log["turnId"].is_null() || same_turn)
        && timestamp(hook).abs_diff(timestamp(log)) <= CORRELATION_MS;
    match (hook["eventName"].as_str(), log["eventName"].as_str()) {
        (Some("SessionStart"), Some("SessionStart")) => near,
        (Some("Interrupt"), Some("StopFailure")) | (Some("Stop"), Some("Stop")) => {
            same_turn || near
        }
        (Some("Stop"), Some("AssistantOutput"))
        | (Some("UserPromptSubmit"), Some("UserPromptSubmit")) => {
            (same_turn || near) && hook["summary"] == log["summary"]
        }
        (Some("PermissionRequest"), Some("PermissionRequest")) => {
            near && (hook["toolName"] == log["toolName"]
                || log["toolName"].is_null()
                || (hook["toolName"] == "Bash" && log["toolName"] == "exec_command"))
        }
        (Some("PreToolUse"), Some("PreToolUse")) | (Some("PostToolUse"), Some("PostToolUse")) => {
            same_id(hook, log, "callId")
        }
        _ => false,
    }
}

fn session(id: &str, mut events: Vec<&Value>, time: u64) -> Option<Value> {
    events.sort_by_key(|event| std::cmp::Reverse(timestamp(event)));
    let latest = *events.first()?;
    let cwd = events.iter().find_map(|event| event["cwd"].as_str());
    let title = cwd
        .and_then(|path| Path::new(path).file_name())
        .and_then(|name| name.to_str())
        .unwrap_or(id);
    let mut phase = "idle";
    let mut pending = Value::Null;
    let mut turn = None;
    let mut turn_ended = false;
    let mut source = "log";
    for event in events.iter().rev().copied() {
        let name = event["eventName"].as_str().unwrap_or_default();
        // Completion and tool hooks from an older turn can arrive after a new prompt.
        let event_turn = event["turnId"].as_str().filter(|id| !id.is_empty());
        if matches!(name, "TurnStart" | "UserPromptSubmit") {
            turn = event_turn;
            turn_ended = false;
        } else if event_turn.is_some() && turn.is_some() && event_turn != turn {
            continue;
        }
        match name {
            "SessionStart" if !matches!(phase, "running" | "waiting_permission") => {
                phase = "idle";
                turn = None;
                turn_ended = false;
            }
            "TurnStart" | "UserPromptSubmit" => phase = "running",
            "PostToolUse"
                if phase == "waiting_permission"
                    && event["toolName"].is_string()
                    && pending["toolName"].is_string()
                    && event["toolName"] != pending["toolName"] =>
            {
                continue
            }
            "PreToolUse" if phase == "waiting_permission" => continue,
            "PreToolUse" | "PostToolUse" if phase != "completed" && !turn_ended => {
                phase = "running"
            }
            "PermissionRequest" if phase != "completed" && !turn_ended => {
                phase = "waiting_permission"
            }
            "Stop" | "StopFailure" | "Interrupt" if phase != "completed" => {
                phase = "idle";
                turn_ended = true;
            }
            "SessionEnd" => phase = "completed",
            _ => continue,
        }
        pending = if phase == "waiting_permission" {
            event.clone()
        } else {
            Value::Null
        };
        source = if event["source"] == "hook" {
            "hook"
        } else {
            "log"
        };
    }
    if source == "log" && time.saturating_sub(timestamp(latest)) > STALE_MS {
        phase = "completed";
        pending = Value::Null;
    }
    events.truncate(40);
    Some(json!({
        "id": id, "title": title, "cwd": cwd, "phase": phase, "transcriptPath": latest["transcriptPath"],
        "lastSummary": latest["summary"], "lastEventAt": latest["createdAt"],
        "source": source, "pendingPermission": pending, "events": events
    }))
}

fn visible(event: &Value, state: &Value) -> bool {
    let session = event["sessionId"].as_str().unwrap_or_default();
    timestamp(event)
        > state["clearBefore"].as_u64().unwrap_or_default().max(
            state["deletedBeforeBySession"][session]
                .as_u64()
                .unwrap_or_default(),
        )
}

fn merge(log_sessions: &[Value], hooks: &[Value], state: &Value, time: u64) -> Vec<Value> {
    let mut by_session: HashMap<&str, Vec<&Value>> = HashMap::new();
    for hook in hooks.iter().filter(|event| visible(event, state)) {
        if let Some(id) = hook["sessionId"].as_str() {
            by_session.entry(id).or_default().push(hook);
        }
    }
    for log in log_sessions {
        let Some(id) = log["id"].as_str() else {
            continue;
        };
        let events = by_session.entry(id).or_default();
        let hook_count = events
            .iter()
            .take_while(|event| event["source"] == "hook")
            .count();
        for event in array(&log["events"])
            .iter()
            .filter(|event| event["source"] != "hook" && visible(event, state))
        {
            if !events[..hook_count]
                .iter()
                .any(|hook| equivalent(hook, event))
            {
                events.push(event);
            }
        }
    }
    let mut sessions: Vec<_> = by_session
        .into_iter()
        .filter_map(|(id, events)| session(id, events, time))
        .collect();
    sessions.sort_by(|a, b| {
        b["lastEventAt"]
            .as_u64()
            .cmp(&a["lastEventAt"].as_u64())
            .then_with(|| a["id"].as_str().cmp(&b["id"].as_str()))
    });
    sessions.truncate(1000);
    sessions
}

pub(super) fn refresh(app: &AppHandle, logs: Option<&LogView>) -> Result<Value> {
    let old = snapshot(app, "codex");
    let history = store(app, HISTORY, json!([]));
    let state = store(app, STATE, json!({}));
    let (log_sessions, heatmap) = logs.map_or((array(&old["sessions"]), &old["heatmap"]), |logs| {
        (logs.sessions.as_slice(), &logs.heatmap)
    });
    let sessions = merge(log_sessions, array(&history), &state, now());
    let mut events: Vec<_> = sessions
        .iter()
        .flat_map(|session| array(&session["events"]))
        .collect();
    events.sort_by_key(|event| std::cmp::Reverse(timestamp(event)));
    events.truncate(120);
    let mut current = blank();
    super::codex_metadata(app, &mut current);
    current["events"] = json!(events);
    current["sessions"] = json!(sessions);
    current["heatmap"] = heatmap.clone();

    if logs.is_some() {
        // A recorded rollout already includes historical activity for that session.
        let fallback_ids: HashSet<_> = log_sessions
            .iter()
            .filter_map(|session| session["id"].as_str())
            .collect();
        for event in array(&history)
            .iter()
            .filter(|event| visible(event, &state))
        {
            if event["sessionId"]
                .as_str()
                .is_some_and(|id| fallback_ids.contains(id))
            {
                continue;
            }
            let field = match event["eventName"].as_str() {
                Some("SessionStart") => "session",
                Some("PreToolUse") => "tool",
                Some("UserPromptSubmit") => "prompt",
                _ => continue,
            };
            let Some(date) = chrono::DateTime::from_timestamp_millis(timestamp(event) as i64)
            else {
                continue;
            };
            let day = date
                .with_timezone(&chrono::Local)
                .format("%Y-%-m-%-d")
                .to_string();
            if current["heatmap"][&day].is_null() {
                current["heatmap"][&day] = json!({"session":0,"tool":0,"prompt":0});
            }
            let counts = &mut current["heatmap"][&day];
            counts[field] = json!(counts[field].as_u64().unwrap_or_default() + 1);
        }
    }
    if ["events", "sessions", "heatmap"]
        .iter()
        .any(|field| old[field] != current[field])
    {
        publish(app, "codex", current)
    } else {
        Ok(old)
    }
}

pub(super) fn prune(app: &AppHandle, state: &Value) -> Result<()> {
    let history = store(app, HISTORY, json!([]));
    let (keep, remove): (Vec<_>, Vec<_>) = array(&history)
        .iter()
        .partition(|event| visible(event, state));
    if !remove.is_empty() {
        save_history(app, &keep)?;
        remove_details(app, remove);
    }
    Ok(())
}

fn save_history(app: &AppHandle, events: &[&Value]) -> Result<()> {
    // Journal entries reach the renderer only through the merged CLI snapshot.
    app.state::<crate::state::Desktop>()
        .store
        .lock()
        .unwrap()
        .write(HISTORY, &json!(events))
}

fn remove_details<'a>(app: &AppHandle, events: impl IntoIterator<Item = &'a Value>) {
    for event in events {
        if let Some(id) = event["id"].as_str() {
            let _ = fs::remove_file(details_path(app, id));
        }
    }
}

pub(super) fn receive(app: &AppHandle, payload: Value) -> Result<String> {
    let name = payload["hook_event_name"]
        .as_str()
        .filter(|name| EVENTS.contains(name))
        .ok_or("Invalid Codex hook event")?;
    let session = payload["session_id"]
        .as_str()
        .filter(|id| !id.is_empty() && id.len() <= 128)
        .ok_or("Invalid Codex session ID")?;
    for field in [
        "cwd",
        "transcript_path",
        "tool_name",
        "turn_id",
        "tool_use_id",
    ] {
        if !payload[field].is_null()
            && !payload[field]
                .as_str()
                .is_some_and(|value| value.len() <= 4096)
        {
            return Err("Invalid Codex hook metadata".into());
        }
    }
    let logs = LOG_VIEW.lock().unwrap();
    let state = store(app, STATE, json!({}));
    if state["enabled"] == false || !configured() {
        return Ok("{}".into());
    }
    let id = format!("codex-hook:{}", uuid::Uuid::new_v4());
    let mut event = payload_event(&payload, name, session, &payload["cwd"], now(), &id);
    event["source"] = json!("hook");
    event["detailProvider"] = json!("codex");
    event["turnId"] = payload["turn_id"].clone();
    event["callId"] = payload["tool_use_id"].clone();
    if name == "PermissionRequest" && payload["tool_input"]["command"].is_string() {
        event["toolInputPreview"] = json!(preview(&payload["tool_input"]["command"]));
    }
    let path = details_path(app, &id);
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(
        &path,
        serde_json::to_vec_pretty(&json!({"details":event["detailItems"],"raw":payload}))
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    // Large tool results stay off the live IPC stream.
    for item in event["detailItems"].as_array_mut().unwrap() {
        item["value"] = json!(preview(&item["value"]));
    }
    let history = store(app, HISTORY, json!([]));
    let all: Vec<_> = std::iter::once(&event).chain(array(&history)).collect();
    let (keep, remove) = all.split_at(all.len().min(HISTORY_LIMIT));
    if let Err(error) = save_history(app, keep) {
        let _ = fs::remove_file(path);
        return Err(error);
    }
    let result = refresh(app, logs.as_ref());
    remove_details(app, remove.iter().copied());
    result.map(|_| "{}".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event(name: &str, time: u64, turn: &str, source: &str) -> Value {
        json!({
            "id": format!("{source}-{time}"), "eventName": name, "sessionId": "thread",
            "createdAt": time, "turnId": turn, "source": source
        })
    }

    fn reduce(events: &[Value], time: u64) -> Value {
        session("thread", events.iter().collect(), time).unwrap()
    }

    #[test]
    fn session_reducer_preserves_waits_and_distinguishes_turn_and_thread_end() {
        let mut events = vec![
            event("SessionStart", 1, "", "hook"),
            event("UserPromptSubmit", 2, "first", "hook"),
            json!({"eventName":"PermissionRequest","createdAt":3,"turnId":"first","toolName":"Bash","source":"hook"}),
            json!({"eventName":"PostToolUse","createdAt":4,"turnId":"first","toolName":"Read","source":"hook"}),
            event("AssistantOutput", 5, "first", "log"),
        ];
        let waiting = reduce(&events, 5);
        assert_eq!(waiting["phase"], "waiting_permission");
        assert_eq!(waiting["pendingPermission"]["toolName"], "Bash");

        events.push(event("Interrupt", 6, "first", "hook"));
        let interrupted = reduce(&events, 6);
        assert_eq!(interrupted["phase"], "idle");
        assert_eq!(interrupted["pendingPermission"], Value::Null);

        events.extend([
            event("UserPromptSubmit", 7, "second", "hook"),
            event("Stop", 8, "first", "hook"),
        ]);
        assert_eq!(reduce(&events, 8)["phase"], "running");
        events.push(event("Stop", 9, "second", "hook"));
        assert_eq!(reduce(&events, 9)["phase"], "idle");
        events.push(event("PostToolUse", 10, "second", "hook"));
        assert_eq!(reduce(&events, 10)["phase"], "idle");
        events.push(event("SessionEnd", 11, "", "hook"));
        assert_eq!(reduce(&events, 11)["phase"], "completed");
    }

    #[test]
    fn merge_prefers_correlated_hooks_keeps_log_history_and_honors_cutoffs() {
        let mut hook = event("PreToolUse", 7000, "current", "hook");
        hook["callId"] = json!("call_1");
        let mut same_tool = event("PreToolUse", 7001, "current", "log");
        same_tool["callId"] = json!("call_1");
        let mut other_tool = event("PreToolUse", 7002, "current", "log");
        other_tool["callId"] = json!("call_2");
        let logs = vec![json!({"id":"thread","events":[
            event("SessionStart", 1, "", "log"),
            event("Stop", 6001, "previous", "log"),
            same_tool,
            other_tool
        ]})];
        let hooks = [hook, event("Stop", 7500, "current", "hook")];
        let merged = merge(&logs, &hooks, &json!({}), 7500);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0]["phase"], "idle");
        let names: Vec<_> = array(&merged[0]["events"])
            .iter()
            .map(|record| &record["id"])
            .collect();
        assert_eq!(
            names,
            [
                &json!("hook-7500"),
                &json!("log-7002"),
                &json!("hook-7000"),
                &json!("log-6001"),
                &json!("log-1")
            ]
        );

        let deleted = merge(
            &logs,
            &hooks,
            &json!({"deletedBeforeBySession":{"thread":7500}}),
            7501,
        );
        assert!(deleted.is_empty());
        let fallback = merge(&logs, &[], &json!({}), STALE_MS + 7003);
        assert_eq!(fallback[0]["phase"], "completed");
    }

    #[test]
    fn configuring_and_removing_hooks_preserves_user_entries_and_is_idempotent() {
        let original = json!({
            "description": "user config",
            "hooks": { "Stop": [{"matcher":"", "hooks":[{"type":"command","command":"user-hook"}]}] }
        });
        let mut config = original.clone();
        let exe = Path::new("a path with ' and $/eIsland.exe");
        configure(&mut config, Some(exe)).unwrap();
        for event in EVENTS {
            assert!(array(&config["hooks"][event])
                .iter()
                .any(|group| { array(&group["hooks"]).iter().any(is_managed) }));
        }
        assert_eq!(config["hooks"]["Stop"][0], original["hooks"]["Stop"][0]);
        let installed = config.clone();
        configure(&mut config, Some(exe)).unwrap();
        assert_eq!(config, installed);
        configure(&mut config, None).unwrap();
        assert_eq!(config, original);
    }
}
