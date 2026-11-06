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
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{AppHandle, Emitter, Manager};

pub struct Images {
    gate: Arc<tokio::sync::Semaphore>,
}
pub fn start(app: &AppHandle) {
    app.manage(Images {
        gate: Arc::new(tokio::sync::Semaphore::new(1)),
    });
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "image-compression:start" | "image-compression:list" | "image-compression:remove"
    )
}
fn history(app: &AppHandle) -> Vec<Value> {
    let state = app.state::<Desktop>();
    let store = state.store.lock().unwrap();
    let mut rows = store
        .value("image-compression-tasks", json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default();
    if restore_history(&mut rows) {
        let _ = store.write("image-compression-tasks", &json!(rows));
    }
    rows
}
fn restore_history(rows: &mut [Value]) -> bool {
    let mut changed = false;
    for row in rows {
        changed |= crate::shared::file_names::repair_file_name(row, &["inputPath", "outputPath"]);
    }
    changed
}

fn publish(app: &AppHandle, task: &Value) {
    let mut rows = history(app);
    rows.retain(|row| row["id"] != task["id"]);
    rows.insert(0, task.clone());
    rows.truncate(200);
    let _ = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .write("image-compression-tasks", &json!(rows));
    let _ = app.emit(
        "eisland-ipc",
        json!({"channel":"image-compression:task-updated","args":[task]}),
    );
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let a = args.first().unwrap_or(&Value::Null);
    match channel {
        "image-compression:list" => Ok(json!(history(app))),
        "image-compression:remove" => {
            let mut rows = history(app);
            let before = rows.len();
            rows.retain(|v| v["id"] != *a);
            app.state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .write("image-compression-tasks", &json!(rows))?;
            Ok(json!(before != rows.len()))
        }
        "image-compression:start" => {
            let paths = a["inputPaths"].as_array().ok_or("Image paths missing")?;
            if paths.is_empty() || paths.len() > 200 {
                return Err("Select between 1 and 200 images".into());
            }
            let quality = a["quality"]
                .as_f64()
                .filter(|v| v.is_finite())
                .unwrap_or(80.)
                .floor()
                .clamp(10., 100.) as u64;
            let directory = a["outputDir"].as_str().map(PathBuf::from);
            let semaphore = app.state::<Images>().gate.clone();
            let _slot = semaphore.acquire().await.map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for path in paths.iter().filter_map(Value::as_str) {
                let input = Path::new(path);
                let parent = directory
                    .clone()
                    .or_else(|| input.parent().map(Path::to_path_buf))
                    .ok_or("Image directory missing")?;
                fs::create_dir_all(&parent).map_err(|e| e.to_string())?;
                let target = output_path(input, &parent);
                let id = uuid::Uuid::new_v4().to_string();
                let now = crate::shared::time::now_ms();
                let original = fs::metadata(input).ok().map(|m| m.len()).unwrap_or(0);
                let ext = input
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let mut params = vec![
                    "-n".into(),
                    "-hide_banner".into(),
                    "-loglevel".into(),
                    "error".into(),
                    "-i".into(),
                    path.into(),
                ];
                let allowed = match ext.as_str() {
                    "jpg" | "jpeg" => {
                        params.extend([
                            "-q:v".into(),
                            (31 - (quality as f64 / 100. * 29.).round() as u64)
                                .clamp(2, 31)
                                .to_string(),
                        ]);
                        true
                    }
                    "png" => {
                        params.extend([
                            "-compression_level".into(),
                            (((100 - quality) as f64 / 100. * 9.).round() as u64).to_string(),
                        ]);
                        true
                    }
                    "webp" => {
                        params.extend(["-quality".into(), quality.to_string()]);
                        true
                    }
                    "bmp" => true,
                    _ => false,
                };
                params.push(target.to_string_lossy().into_owned());
                let outcome = if !input.is_file() {
                    Err("Source file not found".into())
                } else if !allowed {
                    Err("Unsupported image format".into())
                } else {
                    crate::features::wallpaper::video::run(app, &params, None)
                        .await
                        .map(|_| ())
                };
                let compressed = if outcome.is_ok() {
                    fs::metadata(&target).map_err(|e| e.to_string())?.len()
                } else {
                    0
                };
                let success = outcome.is_ok();
                let task = json!({"id":id,"fileName":input.file_name().unwrap_or_default().to_string_lossy(),"inputPath":input,"outputPath":target,"quality":quality,"status":if success{"completed"}else{"failed"},"success":success,"originalBytes":original,"compressedBytes":compressed,"ratio":if success&&original>0{(original as f64-compressed as f64)/original as f64}else{0.},"error":outcome.err(),"createdAt":now,"updatedAt":crate::shared::time::now_ms()});
                publish(app, &task);
                results.push(task);
            }
            Ok(json!({"ok":true,"results":results}))
        }
        _ => Err("Unknown image operation".into()),
    }
}
fn output_path(input: &Path, directory: &Path) -> PathBuf {
    let base = input.file_stem().unwrap_or_default().to_string_lossy();
    let ext = input.extension().unwrap_or_default().to_string_lossy();
    let mut index = 0;
    loop {
        let suffix = if index == 0 {
            String::new()
        } else {
            format!("_{index}")
        };
        let target = directory.join(format!("{base}_compressed{suffix}.{ext}"));
        if !target.exists() {
            return target;
        }
        index += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn compression_history_repairs_names_without_removing_records_or_changing_results() {
        let mut rows = vec![
            json!({"id":"old","fileName":{"Windows":[65]},"inputPath":"C:\\图片\\示例😀.png","outputPath":"C:\\输出.png","status":"completed","compressedBytes":42}),
            json!({"id":"new","fileName":"valid.png","success":true}),
            json!({"id":"second-old","fileName":{"Windows":[66]},"inputPath":"C:\\图片\\另一张.png"}),
        ];
        let before = rows.clone();
        assert!(restore_history(&mut rows));
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0]["fileName"], "示例😀.png");
        assert_eq!(rows[0]["compressedBytes"], 42);
        assert_eq!(rows[0]["status"], "completed");
        assert_eq!(rows[1], before[1]);
        assert_eq!(rows[2]["fileName"], "另一张.png");
        assert!(!restore_history(&mut rows));
    }
}
