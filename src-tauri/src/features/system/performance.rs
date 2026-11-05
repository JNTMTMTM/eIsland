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
use serde_json::{json, Value};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex, OnceLock,
    },
    time::{Duration, Instant},
};
use tauri::AppHandle;
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout},
    sync::Notify,
};

const OUTPUT_LIMIT: u64 = 1024 * 1024;
static CACHE: OnceLock<Mutex<Option<(Instant, Value)>>> = OnceLock::new();
static SESSION: tokio::sync::Mutex<Option<Session>> = tokio::sync::Mutex::const_new(None);
static RUNNING: AtomicBool = AtomicBool::new(false);
static STOPPED: AtomicBool = AtomicBool::new(false);
static STOP: Notify = Notify::const_new();
struct Session {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
}

/// Sampling is demand driven: returning the previous bounded snapshot keeps UI polling responsive.
/// Only one collector can run, and no further work occurs while the performance panel is closed.
pub fn sample(app: &AppHandle) -> Value {
    let cache = CACHE.get_or_init(|| Mutex::new(None));
    let current = cache.lock().unwrap().clone();
    if STOPPED.load(Ordering::Acquire) {
        return current.map(|(_, value)| value).unwrap_or(Value::Null);
    }
    if current
        .as_ref()
        .is_some_and(|(at, _)| at.elapsed() < Duration::from_secs(3))
    {
        return current.unwrap().1;
    }
    if RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_ok()
    {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            if STOPPED.load(Ordering::Acquire) {
                RUNNING.store(false, Ordering::Release);
                return;
            }
            let value =
                tokio::select! { value=collect(&app)=>Some(value), _=STOP.notified()=>None };
            if let Some(value) = value {
                *CACHE.get().unwrap().lock().unwrap() = Some((Instant::now(), value));
            }
            RUNNING.store(false, Ordering::Release);
        });
    }
    current.map(|(_, value)| value).unwrap_or(Value::Null)
}
pub fn stop() {
    STOPPED.store(true, Ordering::Release);
    STOP.notify_one();
    tauri::async_runtime::spawn(async {
        if let Some(session) = SESSION.lock().await.take() {
            close(session).await;
        }
        #[cfg(windows)]
        pdh::stop();
    });
}
async fn close(mut session: Session) {
    // EOF is the existing C# server's shutdown protocol, including Computer.Close cleanup.
    drop(session.input);
    if tokio::time::timeout(Duration::from_secs(2), session.child.wait())
        .await
        .is_err()
    {
        let _ = session.child.kill().await;
    }
}
async fn open(app: &AppHandle) -> Result<Session> {
    // The helper shares the already bundled volume runtime; it does not require system-wide .NET.
    let path = crate::features::extensions::resolve_native_helper(
        app,
        "volume",
        "eIslandTemperatureReader.exe",
    )?;
    let mut command = crate::infrastructure::child_process::command(path);
    command
        .arg("server")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true);
    let mut child = crate::infrastructure::child_process::spawn(&mut command, true)?;
    let input = child
        .stdin
        .take()
        .ok_or("Temperature helper stdin unavailable")?;
    let output = BufReader::new(
        child
            .stdout
            .take()
            .ok_or("Temperature helper stdout unavailable")?,
    );
    Ok(Session {
        child,
        input,
        output,
    })
}
async fn temperature(app: &AppHandle) -> Result<Value> {
    let mut session = SESSION.lock().await;
    if session.is_none() {
        *session = Some(open(app).await?);
    }
    let result = tokio::time::timeout(Duration::from_secs(8), async {
        let session = session.as_mut().unwrap();
        session
            .input
            .write_all(b"snapshot\n")
            .await
            .map_err(|e| e.to_string())?;
        session.input.flush().await.map_err(|e| e.to_string())?;
        let mut output = Vec::new();
        let count = (&mut session.output)
            .take(OUTPUT_LIMIT + 1)
            .read_until(b'\n', &mut output)
            .await
            .map_err(|e| e.to_string())?;
        if count == 0 || count as u64 > OUTPUT_LIMIT || output.last() != Some(&b'\n') {
            return Err("Temperature helper output exceeds limit or closed".to_owned());
        }
        serde_json::from_slice(&output).map_err(|e| e.to_string())
    })
    .await
    .map_err(|_| "Temperature helper timed out".to_owned())
    .and_then(|value| value);
    if result.is_err() {
        if let Some(child) = session.take() {
            close(child).await;
        }
    }
    result
}
async fn maximum_clock() -> Value {
    static CLOCK: tokio::sync::Mutex<Option<Value>> = tokio::sync::Mutex::const_new(None);
    let mut cache = CLOCK.lock().await;
    if let Some(value) = cache.as_ref() {
        return value.clone();
    }
    #[cfg(windows)]
    {
        use crate::infrastructure::child_process::{self, Options};
        let command=child_process::powershell_command("$ErrorActionPreference='Stop';@((Get-CimInstance Win32_Processor -ErrorAction Stop).MaxClockSpeed)|ConvertTo-Json -Compress");
        if let Ok(output) = child_process::run(
            command,
            Options {
                timeout: Duration::from_secs(5),
                stdout_limit: 4096,
                managed: true,
                ..Options::default()
            },
        )
        .await
        {
            if let Ok(value) = serde_json::from_slice::<Value>(&output.stdout) {
                let values = if let Some(items) = value.as_array() {
                    items.clone()
                } else {
                    vec![value]
                };
                let value = json!(values
                    .into_iter()
                    .filter_map(|value| value.as_f64())
                    .filter(|value| value.is_finite() && *value > 0.)
                    .collect::<Vec<_>>());
                *cache = Some(value.clone());
                return value;
            }
        }
    }
    let value = json!([]);
    *cache = Some(value.clone());
    value
}
async fn collect(app: &AppHandle) -> Value {
    let temps = temperature(app);
    let clock = maximum_clock();
    let gpu = async {
        #[cfg(windows)]
        {
            tauri::async_runtime::spawn_blocking(pdh::sample)
                .await
                .unwrap_or(Value::Null)
        }
        #[cfg(not(windows))]
        {
            Value::Null
        }
    };
    let (temperature, max_clock, gpu) = tokio::join!(temps, clock, gpu);
    let mut value = temperature.unwrap_or(Value::Null);
    if !value.is_object() {
        value = json!({});
    }
    value["maxClockMhz"] = max_clock;
    value["gpuLoads"] = gpu;
    value
}
fn normalized(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}
fn reading(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .filter(|v| v.is_finite() && *v > 0. && *v <= 200.)
}
fn maximum(values: impl Iterator<Item = f64>) -> Option<f64> {
    values.reduce(f64::max)
}

pub fn augment(snapshot: &mut Value, metrics: &Value, selection: &Value) {
    snapshot["cpu"]["speedMaxGhz"] = json!(metrics["maxClockMhz"]
        .as_array()
        .and_then(|values| maximum(values.iter().filter_map(Value::as_f64)))
        .map(|mhz| mhz / 1000.));
    let readings = metrics["temperature"]["readings"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    snapshot["cpu"]["temperatureCelsius"] = json!(maximum(
        readings
            .iter()
            .filter(|item| item["category"] == "cpu")
            .filter_map(|item| reading(&item["temperatureCelsius"]))
    ));
    if selection["disk"]
        .as_str()
        .is_none_or(|disk| disk == "all" || disk.is_empty())
    {
        snapshot["disk"]["temperatureCelsius"] = json!(maximum(
            readings
                .iter()
                .filter(|item| item["category"] == "storage")
                .filter_map(|item| reading(&item["temperatureCelsius"]))
        ));
    }
    if !snapshot["gpu"].is_null() {
        let name = normalized(snapshot["gpu"]["model"].as_str().unwrap_or(""));
        let devices = metrics["hardwareList"]["gpus"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        let device = devices.iter().find(|device| {
            let device = normalized(device["name"].as_str().unwrap_or(""));
            !device.is_empty()
                && !name.is_empty()
                && (device.contains(&name) || name.contains(&device))
        });
        snapshot["gpu"]["temperatureCelsius"] = json!(maximum(
            readings
                .iter()
                .filter(|item| {
                    if item["category"] != "gpu" {
                        return false;
                    }
                    if let Some(device) = device {
                        let id = device["id"].as_str().unwrap_or("");
                        !id.is_empty()
                            && item["id"].as_str().is_some_and(|item| item.starts_with(id))
                    } else {
                        let label = normalized(item["label"].as_str().unwrap_or(""));
                        !name.is_empty() && label.contains(&name)
                    }
                })
                .filter_map(|item| reading(&item["temperatureCelsius"]))
        ));
        let luid = snapshot["gpu"]["_luid"].as_str().unwrap_or("");
        let load = metrics["gpuLoads"][luid]
            .as_f64()
            .filter(|v| v.is_finite())
            .map(|v| v.clamp(0., 100.));
        snapshot["gpu"]["loadPercent"] = json!(load);
        if let Some(gpu) = snapshot["gpu"].as_object_mut() {
            gpu.remove("_luid");
        }
    }
}

#[cfg(windows)]
mod pdh {
    use super::*;
    use std::collections::HashMap;
    use windows_sys::Win32::System::Performance::*;
    // pdh.h defines this scaling flag; windows-sys 0.61 omits the declaration.
    const PDH_FMT_NOCAP100: u32 = 0x0000_8000;
    static QUERY: Mutex<Option<Query>> = Mutex::new(None);
    struct Query {
        query: usize,
        counter: usize,
    }
    impl Drop for Query {
        fn drop(&mut self) {
            unsafe {
                PdhCloseQuery(self.query as _);
            }
        }
    }
    impl Query {
        fn open() -> Option<Self> {
            let mut query = std::ptr::null_mut();
            if unsafe { PdhOpenQueryW(std::ptr::null(), 0, &mut query) } != 0 {
                return None;
            }
            let mut result = Self {
                query: query as usize,
                counter: 0,
            };
            let path = "\\GPU Engine(*)\\Utilization Percentage"
                .encode_utf16()
                .chain(Some(0))
                .collect::<Vec<_>>();
            let mut counter = std::ptr::null_mut();
            if unsafe { PdhAddEnglishCounterW(query, path.as_ptr(), 0, &mut counter) } != 0 {
                return None;
            }
            result.counter = counter as usize;
            if unsafe { PdhCollectQueryData(query) } != 0 {
                return None;
            }
            std::thread::sleep(Duration::from_millis(250));
            Some(result)
        }
        fn read(&mut self) -> Option<Value> {
            if unsafe { PdhCollectQueryData(self.query as _) } != 0 {
                return None;
            }
            let mut bytes = 0u32;
            let mut count = 0u32;
            let status = unsafe {
                PdhGetFormattedCounterArrayW(
                    self.counter as _,
                    PDH_FMT_DOUBLE | PDH_FMT_NOCAP100,
                    &mut bytes,
                    &mut count,
                    std::ptr::null_mut(),
                )
            };
            if status != PDH_MORE_DATA || bytes == 0 || bytes > 4 * 1024 * 1024 {
                return None;
            }
            // u64 storage ensures the alignment required by PDH_FMT_COUNTERVALUE_ITEM_W.
            let mut buffer = vec![0u64; (bytes as usize).div_ceil(8)];
            let allocated = buffer.len() * 8;
            let status = unsafe {
                PdhGetFormattedCounterArrayW(
                    self.counter as _,
                    PDH_FMT_DOUBLE | PDH_FMT_NOCAP100,
                    &mut bytes,
                    &mut count,
                    buffer.as_mut_ptr().cast(),
                )
            };
            if status != 0
                || count as usize > allocated / std::mem::size_of::<PDH_FMT_COUNTERVALUE_ITEM_W>()
            {
                return None;
            }
            let items = unsafe {
                std::slice::from_raw_parts(
                    buffer.as_ptr().cast::<PDH_FMT_COUNTERVALUE_ITEM_W>(),
                    count as usize,
                )
            };
            let mut engines = Vec::new();
            for item in items {
                if !matches!(
                    item.FmtValue.CStatus,
                    PDH_CSTATUS_VALID_DATA | PDH_CSTATUS_NEW_DATA
                ) {
                    continue;
                }
                let name = item.szName as usize;
                let start = buffer.as_ptr() as usize;
                if name < start || name >= start + allocated || !(name - start).is_multiple_of(2) {
                    continue;
                }
                let length = (start + allocated - name) / 2;
                let text = unsafe { std::slice::from_raw_parts(item.szName, length) };
                let end = text.iter().position(|c| *c == 0).unwrap_or(length);
                let load = unsafe { item.FmtValue.Anonymous.doubleValue };
                if load.is_finite() {
                    engines.push((String::from_utf16_lossy(&text[..end]), load));
                }
            }
            let mut groups: HashMap<(String, String), f64> = HashMap::new();
            for (instance, load) in engines {
                if let Some((luid, engine)) = engine_key(&instance) {
                    *groups.entry((luid, engine)).or_default() += load.max(0.);
                }
            }
            let mut values = serde_json::Map::new();
            for ((luid, _), load) in groups {
                let current = values.get(&luid).and_then(Value::as_f64).unwrap_or(0.);
                values.insert(luid, json!(current.max(load).clamp(0., 100.)));
            }
            Some(Value::Object(values))
        }
    }
    pub fn sample() -> Value {
        let mut query = QUERY.lock().unwrap();
        if query.is_none() {
            *query = Query::open();
        }
        query.as_mut().and_then(Query::read).unwrap_or(Value::Null)
    }
    pub fn stop() {
        QUERY.lock().unwrap().take();
    }
}
fn engine_key(instance: &str) -> Option<(String, String)> {
    let (_, tail) = instance.split_once("luid_")?;
    let (luid, engine) = tail.split_once("_phys_")?;
    let (engine, _) = engine.split_once("_engtype_")?;
    Some((
        format!("luid_{}", luid.to_ascii_lowercase()),
        engine.to_owned(),
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn telemetry_is_from_matching_devices_and_preserves_unavailable_values() {
        let mut snapshot = json!({"cpu":{},"disk":{},"gpu":{"model":"NVIDIA Test GPU","_luid":"luid_0x00000000_0x00000001"}});
        let metrics = json!({"maxClockMhz":[4500],"gpuLoads":{"luid_0x00000000_0x00000001":23.5},"hardwareList":{"gpus":[{"id":"/gpu-nvidia/0","name":"NVIDIA Test GPU"}]},"temperature":{"readings":[{"category":"cpu","temperatureCelsius":54.},{"category":"gpu","id":"/gpu-nvidia/0/temperature/0","temperatureCelsius":61.},{"category":"gpu","id":"/gpu-intel/0/temperature/0","temperatureCelsius":90.},{"category":"storage","temperatureCelsius":40.}]}});
        augment(&mut snapshot, &metrics, &json!({}));
        assert_eq!(snapshot["cpu"]["speedMaxGhz"], 4.5);
        assert_eq!(snapshot["cpu"]["temperatureCelsius"], 54.);
        assert_eq!(snapshot["gpu"]["temperatureCelsius"], 61.);
        assert_eq!(snapshot["gpu"]["loadPercent"], 23.5);
        assert_eq!(snapshot["disk"]["temperatureCelsius"], 40.);
        assert!(snapshot["gpu"].get("_luid").is_none());
        augment(&mut snapshot, &Value::Null, &json!({"disk":"fs:0"}));
        assert!(snapshot["cpu"]["temperatureCelsius"].is_null());
        assert!(snapshot["gpu"]["loadPercent"].is_null());
    }
    #[test]
    fn pdh_instances_group_processes_by_physical_adapter_engine() {
        assert_eq!(
            engine_key("pid_32_luid_0x00000000_0x0000ABCD_phys_0_eng_1_engtype_3D"),
            Some(("luid_0x00000000_0x0000abcd".into(), "0_eng_1".into()))
        );
        assert!(engine_key("unrelated").is_none());
    }
}
