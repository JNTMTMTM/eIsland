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

use crate::shared::Result;
use crate::state::Desktop;
use futures_util::{future::try_join_all, StreamExt};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{watch, Semaphore};

struct Job {
    snapshot: Value,
    stop: watch::Sender<u8>,
    active: bool,
}
pub struct Downloads {
    jobs: Mutex<HashMap<String, Job>>,
    connections: Arc<Semaphore>,
    client: reqwest::Client,
}
impl Downloads {
    pub fn new(app: &AppHandle) -> Self {
        let mut jobs = HashMap::new();
        let mut saved = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .value("download-tasks", json!([]));
        if restore_history(&mut saved) {
            let _ = app
                .state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .write("download-tasks", &saved);
        }
        for snapshot in saved.as_array().cloned().unwrap_or_default() {
            let Some(id) = snapshot["id"].as_str().map(str::to_owned) else {
                continue;
            };
            let (stop, _) = watch::channel(0);
            jobs.insert(
                id,
                Job {
                    snapshot,
                    stop,
                    active: false,
                },
            );
        }
        Self {
            jobs: Mutex::new(jobs),
            connections: Arc::new(Semaphore::new(16)),
            client: reqwest::Client::builder()
                .gzip(false)
                .brotli(false)
                .deflate(false)
                .connect_timeout(Duration::from_secs(10))
                .read_timeout(Duration::from_secs(30))
                .build()
                .expect("HTTP client"),
        }
    }
    fn publish(&self, app: &AppHandle, id: &str) {
        let jobs = self.jobs.lock().unwrap();
        let Some(job) = jobs.get(id) else {
            return;
        };
        let snapshot = job.snapshot.clone();
        let mut history = jobs
            .values()
            .map(|j| j.snapshot.clone())
            .collect::<Vec<_>>();
        history.sort_by_key(|v| std::cmp::Reverse(v["createdAt"].as_u64().unwrap_or(0)));
        history.truncate(1000);
        drop(jobs);
        let _ = app
            .state::<Desktop>()
            .store
            .lock()
            .unwrap()
            .write("download-tasks", &json!(history));
        let _ = app.emit(
            "eisland-ipc",
            json!({"channel":"download:task-updated","args":[snapshot]}),
        );
    }
}
fn restore_history(saved: &mut Value) -> bool {
    let Some(rows) = saved.as_array_mut() else {
        return false;
    };
    let mut changed = false;
    for row in rows {
        changed |= crate::shared::file_names::repair_file_name(row, &["savePath"]);
        if row["id"].is_string() && row["status"] == "downloading" {
            row["status"] = json!("paused");
            row["speedBytesPerSecond"] = json!(0);
            row["estimatedFinishAt"] = Value::Null;
            changed = true;
        }
    }
    changed
}
pub fn start(app: &AppHandle) {
    app.manage(Downloads::new(app));
}
pub fn handles(channel: &str) -> bool {
    channel.starts_with("download:")
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    let state = app.state::<Downloads>();
    match channel {
        "download:get-default-dir" => Ok(json!(app
            .path()
            .download_dir()
            .map_err(|e| e.to_string())?)),
        "download:pick-save-path" => Ok(json!(rfd::AsyncFileDialog::new()
            .set_file_name(safe_name(a.as_str().unwrap_or("download.bin")))
            .save_file()
            .await
            .map(|f| f.path().to_string_lossy().into_owned()))),
        "download:list" => {
            let mut items = state
                .jobs
                .lock()
                .unwrap()
                .values()
                .map(|j| j.snapshot.clone())
                .collect::<Vec<_>>();
            items.sort_by_key(|v| std::cmp::Reverse(v["createdAt"].as_u64().unwrap_or(0)));
            Ok(json!(items))
        }
        "download:get" => Ok(state
            .jobs
            .lock()
            .unwrap()
            .get(a.as_str().unwrap_or(""))
            .map(|j| j.snapshot.clone())
            .unwrap_or(Value::Null)),
        "download:start" => match create(app, a).await {
            Ok(snapshot) => Ok(json!({"ok":true,"task":snapshot})),
            Err(message) => Ok(json!({"ok":false,"message":message})),
        },
        "download:resume" => {
            let id = a.as_str().ok_or("Download id missing")?.to_owned();
            let task = {
                let mut jobs = state.jobs.lock().unwrap();
                let job = jobs.get_mut(&id).ok_or("Download task missing")?;
                if job.active {
                    return Ok(json!({"ok":false,"message":"Download is still stopping"}));
                }
                if !matches!(job.snapshot["status"].as_str(), Some("paused" | "failed")) {
                    return Ok(json!({"ok":false,"message":"Task is not resumable"}));
                }
                if !job.snapshot["_parts"].is_array() {
                    return Ok(
                        json!({"ok":false,"message":"This legacy task has no native resume data; start a new download"}),
                    );
                }
                job.stop.send_replace(0);
                job.snapshot["status"] = json!("downloading");
                job.snapshot["errorMessage"] = Value::Null;
                job.active = true;
                job.snapshot.clone()
            };
            launch(app, &id);
            Ok(json!({"ok":true,"task":task}))
        }
        "download:pause" | "download:cancel" | "download:remove" => {
            let id = a.as_str().unwrap_or("");
            let mut jobs = state.jobs.lock().unwrap();
            let Some(job) = jobs.get_mut(id) else {
                return Ok(json!(false));
            };
            if channel == "download:remove" {
                if job.active {
                    return Ok(json!(false));
                }
                let snapshot = job.snapshot.clone();
                jobs.remove(id);
                drop(jobs);
                cleanup(&snapshot);
                persist(app);
                return Ok(json!(true));
            }
            if !job.active || job.snapshot["_finalizing"] == true {
                return Ok(json!(false));
            }
            let paused = channel == "download:pause";
            job.stop.send_replace(if paused { 1 } else { 2 });
            job.snapshot["status"] = json!(if paused { "paused" } else { "canceled" });
            job.snapshot["speedBytesPerSecond"] = json!(0);
            drop(jobs);
            state.publish(app, id);
            Ok(json!(true))
        }
        _ => Err("Unknown download operation".into()),
    }
}
fn safe_name(name: &str) -> String {
    let value = name
        .chars()
        .map(|c| {
            if c < ' ' || "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect::<String>();
    let value = value.trim_matches(['.', ' ']);
    if value.is_empty() {
        "download.bin".into()
    } else {
        value.to_owned()
    }
}
fn persist(app: &AppHandle) {
    let state = app.state::<Downloads>();
    let values = state
        .jobs
        .lock()
        .unwrap()
        .values()
        .map(|j| j.snapshot.clone())
        .collect::<Vec<_>>();
    let _ = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write("download-tasks", &json!(values));
}
async fn create(app: &AppHandle, payload: &Value) -> Result<Value> {
    let url = payload["url"].as_str().ok_or("Download URL missing")?;
    let parsed = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Downloads require HTTP(S)".into());
    }
    let state = app.state::<Downloads>();
    if state
        .jobs
        .lock()
        .unwrap()
        .values()
        .filter(|j| j.active)
        .count()
        >= 32
    {
        return Err("Too many active downloads".into());
    }
    let response = state
        .client
        .head(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let total = if response.status().is_success() {
        response
            .headers()
            .get(reqwest::header::CONTENT_LENGTH)
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0)
    } else {
        0
    };
    let ranged = response.status().is_success()
        && response
            .headers()
            .get("accept-ranges")
            .is_some_and(|h| h == "bytes")
        && total > 0;
    let name = parsed
        .path_segments()
        .and_then(|mut v| v.next_back())
        .filter(|s| !s.is_empty())
        .unwrap_or("download.bin");
    let name = response
        .headers()
        .get("content-disposition")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split("filename=").nth(1))
        .map(|s| s.trim_matches('"').split(';').next().unwrap_or(name))
        .unwrap_or(name);
    let name = safe_name(name);
    let path = if let Some(path) = payload["savePath"].as_str().filter(|s| !s.is_empty()) {
        PathBuf::from(path)
    } else {
        app.path()
            .download_dir()
            .map_err(|e| e.to_string())?
            .join(&name)
    };
    if path.exists() {
        return Err("Download destination already exists".into());
    }
    fs::create_dir_all(path.parent().ok_or("Destination directory missing")?)
        .map_err(|e| e.to_string())?;
    let threads = if ranged {
        payload["threads"]
            .as_u64()
            .unwrap_or(8)
            .clamp(1, 16)
            .min((total / (256 * 1024)).max(1))
    } else {
        1
    };
    let now = crate::shared::time::now_ms();
    let id = uuid::Uuid::new_v4().to_string();
    let parts = split(total, threads, &path, &id, ranged);
    let snapshot = json!({"id":id,"url":url,"savePath":path,"fileName":path.file_name().unwrap_or_default().to_string_lossy(),"totalBytes":total,"downloadedBytes":0,"progress":0,"speedBytesPerSecond":0,"estimatedFinishAt":null,"threads":threads,"status":"downloading","errorMessage":null,"createdAt":now,"updatedAt":now,"_parts":parts,"_range":ranged,"_etag":response.headers().get("etag").and_then(|v|v.to_str().ok())});
    let (stop, _) = watch::channel(0);
    state.jobs.lock().unwrap().insert(
        id.clone(),
        Job {
            snapshot: snapshot.clone(),
            stop,
            active: true,
        },
    );
    state.publish(app, &id);
    launch(app, &id);
    Ok(snapshot)
}
fn split(total: u64, threads: u64, path: &Path, id: &str, ranged: bool) -> Vec<Value> {
    let chunk = total.div_ceil(threads.max(1));
    (0..threads).map(|index|json!({"start":index*chunk,"end":if ranged{Some(((index+1)*chunk).min(total).saturating_sub(1))}else{None},"path":path.with_file_name(format!(".{}.eisland-{id}-{index}.part",path.file_name().unwrap_or_default().to_string_lossy())),"downloaded":0})).collect()
}
fn launch(app: &AppHandle, id: &str) {
    let app = app.clone();
    let id = id.to_owned();
    tauri::async_runtime::spawn(async move {
        let state = app.state::<Downloads>();
        let snapshot = state.jobs.lock().unwrap()[&id].snapshot.clone();
        let parts = snapshot["_parts"].as_array().cloned().unwrap_or_default();
        let started = Instant::now();
        let progress = Arc::new(Mutex::new((Instant::now(), 0u64)));
        let futures = parts.iter().enumerate().map(|(index, part)| {
            download_part(&app, &id, index, part, &snapshot, started, progress.clone())
        });
        let outcome = try_join_all(futures).await;
        let stopped = {
            let mut jobs = state.jobs.lock().unwrap();
            let stopped = jobs.get(&id).map(|j| *j.stop.borrow()).unwrap_or(2);
            if outcome.is_ok() && stopped == 0 {
                if let Some(job) = jobs.get_mut(&id) {
                    job.snapshot["_finalizing"] = json!(true);
                }
            }
            stopped
        };
        let result = if outcome.is_ok() && stopped == 0 {
            let value = snapshot.clone();
            tauri::async_runtime::spawn_blocking(move || merge(&value))
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r)
        } else {
            outcome.map(|_| ())
        };
        {
            let mut jobs = state.jobs.lock().unwrap();
            if let Some(job) = jobs.get_mut(&id) {
                job.active = false;
                job.snapshot["_finalizing"] = json!(false);
                job.snapshot["updatedAt"] = json!(crate::shared::time::now_ms());
                job.snapshot["speedBytesPerSecond"] = json!(0);
                job.snapshot["estimatedFinishAt"] = Value::Null;
                if stopped == 0 {
                    match result {
                        Ok(_) => {
                            job.snapshot["status"] = json!("completed");
                            job.snapshot["progress"] = json!(1);
                        }
                        Err(error) => {
                            job.snapshot["status"] = json!("failed");
                            job.snapshot["errorMessage"] = json!(error);
                        }
                    }
                }
            }
        }
        if stopped == 2 {
            cleanup(&snapshot);
        }
        state.publish(&app, &id);
    });
}
async fn download_part(
    app: &AppHandle,
    id: &str,
    index: usize,
    part: &Value,
    snapshot: &Value,
    started: Instant,
    progress: Arc<Mutex<(Instant, u64)>>,
) -> Result<()> {
    let state = app.state::<Downloads>();
    let mut stop = state.jobs.lock().unwrap()[id].stop.subscribe();
    if *stop.borrow() != 0 {
        return Err("Download stopped".into());
    }
    let slots = state.connections.clone();
    let _slot = tokio::select! {result=slots.acquire_owned()=>result.map_err(|e|e.to_string())?,_=stop.changed()=>return Err("Download stopped".into())};
    let ranged = snapshot["_range"] == true;
    let path = Path::new(part["path"].as_str().ok_or("Part file missing")?);
    let mut done = if ranged {
        fs::metadata(path).ok().map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };
    let first = part["start"].as_u64().unwrap_or(0);
    let end = part["end"].as_u64();
    if let Some(end) = end {
        if first + done > end + 1 {
            return Err("Cached part exceeds expected length".into());
        }
    }
    if let Some(job) = state.jobs.lock().unwrap().get_mut(id) {
        job.snapshot["_parts"][index]["downloaded"] = json!(done);
    }
    if end.is_some_and(|end| first + done > end) {
        return Ok(());
    }
    let mut request = state
        .client
        .get(snapshot["url"].as_str().ok_or("Download URL missing")?);
    if ranged {
        request = request.header("Range", format!("bytes={}-{}", first + done, end.unwrap()));
        if let Some(etag) = snapshot["_etag"].as_str() {
            request = request.header("If-Range", etag);
        }
    }
    let response = tokio::select! {response=request.send()=>response.map_err(|e|e.to_string())?,_=stop.changed()=>return Err("Download stopped".into())};
    if !response.status().is_success() {
        return Err(format!("Download HTTP {}", response.status()));
    }
    if !ranged {
        if let Some(total) = response.content_length() {
            if let Some(job) = state.jobs.lock().unwrap().get_mut(id) {
                job.snapshot["totalBytes"] = json!(total);
            }
        }
    }
    if ranged {
        let expected = format!(
            "bytes {}-{}/{}",
            first + done,
            end.unwrap(),
            snapshot["totalBytes"].as_u64().unwrap_or(0)
        );
        if response.status() != 206
            || response
                .headers()
                .get("content-range")
                .and_then(|v| v.to_str().ok())
                != Some(expected.as_str())
        {
            return Err("Download source changed or ignored the requested range".into());
        }
    }
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(ranged)
        .truncate(!ranged)
        .open(path)
        .map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = tokio::select! {chunk=stream.next()=>chunk,_=stop.changed()=>return Err("Download stopped".into())}
    {
        let chunk = chunk.map_err(|e| e.to_string())?;
        if end.is_some_and(|end| first + done + chunk.len() as u64 > end + 1) {
            return Err("Download range exceeds expected length".into());
        }
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        done += chunk.len() as u64;
        let mut emit = false;
        {
            let mut jobs = state.jobs.lock().unwrap();
            let job = jobs.get_mut(id).ok_or("Download removed")?;
            job.snapshot["_parts"][index]["downloaded"] = json!(done);
            let downloaded = job.snapshot["_parts"]
                .as_array()
                .unwrap()
                .iter()
                .map(|p| p["downloaded"].as_u64().unwrap_or(0))
                .sum::<u64>();
            let total = job.snapshot["totalBytes"].as_u64().unwrap_or(0);
            let seconds = started.elapsed().as_secs_f64().max(0.001);
            let mut last = progress.lock().unwrap();
            if last.0.elapsed() >= Duration::from_millis(200) {
                emit = true;
                last.0 = Instant::now();
                last.1 = downloaded;
            }
            job.snapshot["downloadedBytes"] = json!(downloaded);
            job.snapshot["progress"] = json!(if total > 0 {
                downloaded as f64 / total as f64
            } else {
                0.
            });
            job.snapshot["speedBytesPerSecond"] = json!(downloaded as f64 / seconds);
            job.snapshot["updatedAt"] = json!(crate::shared::time::now_ms());
        }
        if emit {
            state.publish(app, id);
        }
    }
    if end.is_some_and(|end| first + done != end + 1) {
        return Err("Download ended before the expected length".into());
    }
    file.sync_data().map_err(|e| e.to_string())?;
    Ok(())
}
fn merge(snapshot: &Value) -> Result<()> {
    let path = Path::new(snapshot["savePath"].as_str().ok_or("Destination missing")?);
    let staging = path.with_file_name(format!(
        ".{}.eisland-complete",
        snapshot["id"].as_str().unwrap_or("")
    ));
    let mut output = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&staging)
        .map_err(|e| e.to_string())?;
    let outcome = (|| {
        for part in snapshot["_parts"]
            .as_array()
            .ok_or("Download parts missing")?
        {
            let mut file = fs::File::open(part["path"].as_str().ok_or("Part missing")?)
                .map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut output).map_err(|e| e.to_string())?;
        }
        output.sync_all().map_err(|e| e.to_string())?;
        drop(output);
        if path.exists() {
            return Err("Destination appeared during download".into());
        }
        fs::rename(&staging, path).map_err(|e| e.to_string())
    })();
    if outcome.is_err() {
        let _ = fs::remove_file(&staging);
    } else {
        cleanup(snapshot);
    }
    outcome
}
fn cleanup(snapshot: &Value) {
    if let Some(parts) = snapshot["_parts"].as_array() {
        for part in parts {
            if let Some(path) = part["path"].as_str() {
                let _ = fs::remove_file(path);
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parts_cover_download_exactly() {
        let parts = split(1001, 3, Path::new("test.bin"), "fixture", true);
        assert_eq!(parts[0]["start"], 0);
        assert_eq!(parts[0]["end"], 333);
        assert_eq!(parts[1]["start"], 334);
        assert_eq!(parts[2]["end"], 1000);
        assert_eq!(safe_name("../file?.bin"), "_file_.bin");
    }
}

#[cfg(test)]
mod history_tests {
    use super::*;
    #[test]
    fn restoring_display_names_preserves_resumable_parts_and_does_not_drop_history() {
        let paused = json!({"id":"paused","savePath":"C:\\Downloads\\测试😀.zip","fileName":{"Windows":[65]},"status":"paused","downloadedBytes":123,"_parts":[{"path":"existing.part","downloaded":123}],"_range":true});
        let mut history = json!([paused.clone(),{"id":"active","url":"https://example.test/archive.zip","fileName":{"Windows":[66]},"status":"downloading"},{"legacyUnknown":true}]);
        assert!(restore_history(&mut history));
        assert_eq!(history.as_array().unwrap().len(), 3);
        assert_eq!(history[0]["fileName"], "测试😀.zip");
        assert_eq!(history[0]["_parts"], paused["_parts"]);
        assert_eq!(history[0]["status"], "paused");
        assert_eq!(history[0]["downloadedBytes"], 123);
        assert_eq!(history[1]["status"], "paused");
        assert!(history[1]["fileName"].is_string());
        assert!(!restore_history(&mut history));
    }
}
