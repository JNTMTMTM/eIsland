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

use crate::infrastructure::platform::telemetry;
use serde_json::{json, Value};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
static CACHE: Mutex<Option<(Instant, Value)>> = Mutex::new(None);
static RUNNING: AtomicBool = AtomicBool::new(false);
static STOPPED: AtomicBool = AtomicBool::new(false);

/// Debug acceptance checks distinguish a completed collection from optional sensor availability.
#[cfg(debug_assertions)]
pub(crate) fn diagnostics() -> Value {
    let current = CACHE.lock().unwrap().clone();
    json!({
        "sampled": current.is_some(),
        "running": RUNNING.load(Ordering::Acquire),
        "metrics": current.map(|(_, metrics)| metrics),
    })
}

/// Sampling is demand driven: returning the previous bounded snapshot keeps UI polling responsive.
/// Only one collector can run, and no further work occurs while the performance panel is closed.
pub fn sample() -> Value {
    let current = CACHE.lock().unwrap().clone();
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
        tauri::async_runtime::spawn(async {
            if !STOPPED.load(Ordering::Acquire) {
                let result = tauri::async_runtime::spawn_blocking(collect).await;
                if let Ok(metrics) = result {
                    if !STOPPED.load(Ordering::Acquire) {
                        *CACHE.lock().unwrap() = Some((Instant::now(), metrics));
                    }
                }
            }
            RUNNING.store(false, Ordering::Release);
        });
    }
    current.map(|(_, value)| value).unwrap_or(Value::Null)
}

pub fn stop() {
    STOPPED.store(true, Ordering::Release);
    #[cfg(windows)]
    tauri::async_runtime::spawn_blocking(pdh::stop);
}

fn collect() -> Value {
    let readings = telemetry::temperatures();
    #[cfg(windows)]
    let (clocks, gpu_temperatures, gpu_loads) = (
        telemetry::cpu_clocks(),
        json!(telemetry::gpu_temperatures()),
        pdh::sample(),
    );
    #[cfg(not(windows))]
    let (clocks, gpu_temperatures, gpu_loads) = (Vec::<u32>::new(), Value::Null, Value::Null);
    json!({
        "temperature": {"isAvailable": !readings.is_empty() || gpu_temperatures.as_object().is_some_and(|values| !values.is_empty()), "readings": readings},
        "maxClockMhz": clocks,
        "gpuTemperatures": gpu_temperatures,
        "gpuLoads": gpu_loads,
    })
}

fn maximum(values: impl Iterator<Item = f64>) -> Option<f64> {
    values.reduce(f64::max)
}

pub fn augment(snapshot: &mut Value, metrics: &Value, selection: &Value) {
    snapshot["cpu"]["speedMaxGhz"] = json!(metrics["maxClockMhz"]
        .as_array()
        .and_then(|values| maximum(values.iter().filter_map(Value::as_f64)))
        .map(|mhz| mhz / 1000.));
    let hottest = |category: &str| {
        maximum(
            metrics["temperature"]["readings"]
                .as_array()
                .into_iter()
                .flatten()
                .filter(|item| item["category"] == category)
                .filter_map(|item| {
                    telemetry::valid_temperature(item["temperatureCelsius"].as_f64()?)
                }),
        )
    };
    snapshot["cpu"]["temperatureCelsius"] = json!(hottest("cpu"));
    if selection["disk"]
        .as_str()
        .is_none_or(|disk| disk == "all" || disk.is_empty())
    {
        snapshot["disk"]["temperatureCelsius"] = json!(hottest("storage"));
    }
    if let Some(gpu) = snapshot["gpu"].as_object_mut() {
        let luid = gpu.remove("_luid");
        let luid = luid.as_ref().and_then(Value::as_str).unwrap_or("");
        let temperature = metrics["gpuTemperatures"][luid]
            .as_f64()
            .and_then(telemetry::valid_temperature);
        let load = metrics["gpuLoads"][luid]
            .as_f64()
            .filter(|v| v.is_finite())
            .map(|v| v.clamp(0., 100.));
        gpu.insert("temperatureCelsius".into(), json!(temperature));
        gpu.insert("loadPercent".into(), json!(load));
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
        if STOPPED.load(Ordering::Acquire) {
            return Value::Null;
        }
        if query.is_none() {
            *query = Query::open();
        }
        query.as_mut().and_then(Query::read).unwrap_or(Value::Null)
    }
    pub fn stop() {
        QUERY.lock().unwrap().take();
    }
}
#[cfg(any(windows, test))]
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
        let metrics = json!({
            "maxClockMhz":[4500],
            "gpuLoads":{"luid_0x00000000_0x00000001":23.5},
            "gpuTemperatures":{"luid_0x00000000_0x00000001":61.,"luid_0x00000000_0x00000002":90.},
            "temperature":{"readings":[
                {"category":"cpu","temperatureCelsius":54.},
                {"category":"system","temperatureCelsius":85.},
                {"category":"storage","temperatureCelsius":40.}
            ]}
        });
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

    #[test]
    fn missing_clock_and_sensors_preserve_null_without_inventing_hardware_readings() {
        for metrics in [
            Value::Null,
            json!({"maxClockMhz":[],"gpuLoads":null,"temperature":{"isAvailable":false,"readings":[]}}),
        ] {
            let mut snapshot = json!({"cpu":{"speedGhz":2.5,"loadPercent":0.},"memory":{"totalBytes":1024},"disk":{},"gpu":null});
            augment(&mut snapshot, &metrics, &json!({}));
            assert!(snapshot["cpu"]["speedMaxGhz"].is_null());
            assert!(snapshot["cpu"]["temperatureCelsius"].is_null());
            assert!(snapshot["disk"]["temperatureCelsius"].is_null());
            assert!(snapshot["gpu"].is_null());
            assert_eq!(snapshot["cpu"]["speedGhz"], 2.5);
            assert_eq!(snapshot["memory"]["totalBytes"], 1024);
        }
    }
}
