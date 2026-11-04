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

use crate::windows::Result;
use chrono::{Local, TimeZone};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs::File,
    io::{BufRead, BufReader, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::SystemTime,
};
use tauri::AppHandle;

#[derive(Clone, Default)]
struct Record {
    key: String,
    time: u64,
    session: String,
    model: String,
    tokens: [u64; 4],
}
#[derive(Default)]
struct Cached {
    offset: u64,
    modified: Option<SystemTime>,
    records: Vec<Record>,
    session: String,
    model: String,
    total: Option<[u64; 4]>,
    limits: Value,
}
static CACHE: OnceLock<Mutex<HashMap<PathBuf, Cached>>> = OnceLock::new();
pub fn home() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_default()
}
pub fn timestamp(value: &Value) -> u64 {
    value
        .as_u64()
        .or_else(|| {
            value.as_str().and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|v| v.timestamp_millis().max(0) as u64)
            })
        })
        .unwrap_or(0)
}
pub fn read_log_line(reader: &mut impl BufRead, line: &mut Vec<u8>) -> Result<(usize, bool)> {
    line.clear();
    let mut length = 0;
    loop {
        let buffer = reader.fill_buf().map_err(|e| e.to_string())?;
        if buffer.is_empty() {
            return Ok((length, false));
        }
        let end = buffer.iter().position(|byte| *byte == b'\n');
        let consumed = end.map(|index| index + 1).unwrap_or(buffer.len());
        let retained = consumed.min((8 * 1024 * 1024 + 1usize).saturating_sub(line.len()));
        line.extend_from_slice(&buffer[..retained]);
        length += consumed;
        reader.consume(consumed);
        if end.is_some() {
            return Ok((length, true));
        }
    }
}
fn tokens(value: &Value, claude: bool) -> [u64; 4] {
    let cached = value[if claude {
        "cache_read_input_tokens"
    } else {
        "cached_input_tokens"
    }]
    .as_u64()
    .unwrap_or(0);
    let input = value["input_tokens"].as_u64().unwrap_or(0);
    [
        if claude {
            input
        } else {
            input.saturating_sub(cached)
        },
        value["output_tokens"].as_u64().unwrap_or(0),
        cached,
        value[if claude {
            "cache_creation_input_tokens"
        } else {
            "cache_write_input_tokens"
        }]
        .as_u64()
        .unwrap_or(0),
    ]
}
fn token_json(tokens: [u64; 4]) -> Value {
    json!({"input":tokens[0],"output":tokens[1],"cacheRead":tokens[2],"cacheWrite":tokens[3],"total":tokens.iter().sum::<u64>()})
}
fn limits(value: &Value, time: u64) -> Value {
    let window = |value: &Value| {
        if value["used_percent"].is_number() {
            json!({"usedPercent":value["used_percent"].as_f64().unwrap_or(0.).clamp(0.,100.),"windowMinutes":value["window_minutes"],"resetsAt":value["resets_at"].as_u64().map(|v|v*1000)})
        } else {
            Value::Null
        }
    };
    json!({"primary":window(&value["primary"]),"secondary":window(&value["secondary"]),"planType":value["plan_type"],"updatedAt":time})
}
fn parse(value: &Value, cache: &mut Cached, key: String, claude: bool) -> Option<Record> {
    let time = timestamp(&value["timestamp"]);
    let kind = value["type"].as_str().unwrap_or("");
    if claude {
        let message = &value["message"];
        if kind != "assistant" || !message["usage"].is_object() {
            return None;
        }
        let tokens = tokens(&message["usage"], true);
        if tokens.iter().all(|v| *v == 0) {
            return None;
        }
        let key = if message["id"].is_string() || value["requestId"].is_string() {
            format!(
                "claude:{}:{}",
                message["id"].as_str().unwrap_or(""),
                value["requestId"].as_str().unwrap_or("")
            )
        } else {
            format!(
                "claude:{}",
                value["uuid"].as_str().map(str::to_owned).unwrap_or(key)
            )
        };
        return Some(Record {
            key,
            time,
            session: value["sessionId"].as_str().unwrap_or("").into(),
            model: message["model"]
                .as_str()
                .filter(|s| *s != "<synthetic>")
                .unwrap_or("")
                .into(),
            tokens,
        });
    }
    let payload = &value["payload"];
    if kind == "session_meta" {
        cache.session = payload["id"].as_str().unwrap_or(&cache.session).to_owned();
    }
    if kind == "turn_context" {
        if let Some(model) = payload["model"].as_str() {
            cache.model = model.into();
        }
    }
    if kind != "event_msg" || payload["type"] != "token_count" {
        return None;
    }
    if payload["rate_limits"].is_object() {
        cache.limits = limits(&payload["rate_limits"], time);
    }
    let total_value = &payload["info"]["total_token_usage"];
    if !total_value.is_object() {
        return None;
    }
    let total = tokens(total_value, false);
    let last = tokens(&payload["info"]["last_token_usage"], false);
    let result = match cache.total {
        None => total,
        Some(previous) if total.iter().sum::<u64>() < previous.iter().sum() => last,
        Some(previous) => std::array::from_fn(|i| total[i].saturating_sub(previous[i])),
    };
    cache.total = Some(total);
    if result.iter().all(|v| *v == 0) {
        return None;
    }
    Some(Record {
        key,
        time,
        session: cache.session.clone(),
        model: cache.model.clone(),
        tokens: result,
    })
}
fn files(root: &Path, since: u64) -> Vec<PathBuf> {
    if !root.is_dir() {
        return vec![];
    }
    walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_type().is_file()
                && entry.path().extension().is_some_and(|ext| ext == "jsonl")
                && entry
                    .metadata()
                    .ok()
                    .and_then(|v| v.modified().ok())
                    .and_then(|v| v.duration_since(std::time::UNIX_EPOCH).ok())
                    .is_some_and(|v| v.as_millis() as u64 >= since)
        })
        .take(10000)
        .map(|entry| entry.into_path())
        .collect()
}
fn scan(path: &Path, cached: &mut Cached, claude: bool) -> Result<()> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let meta = file.metadata().map_err(|e| e.to_string())?;
    if cached.modified == meta.modified().ok() && cached.offset == meta.len() {
        return Ok(());
    }
    if meta.len() < cached.offset {
        *cached = Cached::default();
    }
    file.seek(SeekFrom::Start(cached.offset))
        .map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let mut line = Vec::new();
    loop {
        let (bytes, complete) = read_log_line(&mut reader, &mut line)?;
        if bytes == 0 || !complete {
            break;
        }
        if bytes <= 8 * 1024 * 1024 {
            if let Ok(value) = serde_json::from_slice::<Value>(&line) {
                if let Some(record) = parse(
                    &value,
                    cached,
                    format!("{}:{}", path.display(), cached.offset),
                    claude,
                ) {
                    cached.records.push(record);
                }
            }
        }
        cached.offset += bytes as u64;
    }
    cached.modified = meta.modified().ok();
    Ok(())
}
pub async fn snapshot(_app: &AppHandle) -> Result<Value> {
    tauri::async_runtime::spawn_blocking(read)
        .await
        .map_err(|e| e.to_string())?
}
fn read() -> Result<Value> {
    let generated = super::now();
    let local = Local::now();
    let today = Local
        .with_ymd_and_hms(local.year(), local.month(), local.day(), 0, 0, 0)
        .earliest()
        .ok_or("Cannot resolve local day")?
        .timestamp_millis()
        .max(0) as u64;
    let week = today.saturating_sub(6 * 86400000);
    let roots = [
        ("claude", home().join(".claude/projects")),
        ("codex", home().join(".codex/sessions")),
    ];
    let mut cache = CACHE.get_or_init(Default::default).lock().unwrap();
    let mut retained = HashSet::new();
    let mut providers = Vec::new();
    for (provider, root) in roots {
        let mut records = Vec::new();
        let mut latest = Value::Null;
        for path in files(&root, week) {
            retained.insert(path.clone());
            let entry = cache.entry(path.clone()).or_default();
            if scan(&path, entry, provider == "claude").is_err() {
                continue;
            }
            entry.records.retain(|record| record.time >= week);
            records.extend(entry.records.iter().cloned());
            if entry.limits["updatedAt"].as_u64().unwrap_or(0)
                > latest["updatedAt"].as_u64().unwrap_or(0)
            {
                latest = entry.limits.clone();
            }
        }
        let mut seen = HashSet::new();
        let mut sessions = HashSet::new();
        let mut daily = [0; 4];
        let mut weekly = [0; 4];
        let mut models = HashMap::<String, u64>::new();
        for record in records {
            if record.time < week || !seen.insert(record.key.clone()) {
                continue;
            }
            for (i, value) in record.tokens.iter().enumerate() {
                weekly[i] += value;
                if record.time >= today {
                    daily[i] += value;
                }
            }
            if record.time >= today && !record.session.is_empty() {
                sessions.insert(record.session.clone());
            }
            if !record.model.is_empty() {
                *models.entry(record.model.clone()).or_default() +=
                    record.tokens.iter().sum::<u64>();
            }
        }
        providers.push(json!({"provider":provider,"available":root.is_dir(),"today":token_json(daily),"week":token_json(weekly),"todaySessions":sessions.len(),"topModel":models.into_iter().max_by_key(|(_,count)|*count).map(|(model,_)|model),"rateLimits":latest}));
    }
    cache.retain(|path, _| retained.contains(path));
    Ok(json!({"generatedAt":generated,"providers":providers}))
}
use chrono::Datelike;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn codex_cached_tokens_are_not_double_counted() {
        assert_eq!(
            tokens(
                &json!({"input_tokens":100,"cached_input_tokens":40,"output_tokens":20}),
                false
            ),
            [60, 20, 40, 0]
        );
    }
    #[test]
    fn repeated_codex_cumulative_usage_is_ignored() {
        let mut cache = Cached::default();
        let value = json!({"timestamp":"2026-11-04T12:00:00Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"output_tokens":20}}}});
        assert!(parse(&value, &mut cache, "a".into(), false).is_some());
        assert!(parse(&value, &mut cache, "b".into(), false).is_none());
    }
}
