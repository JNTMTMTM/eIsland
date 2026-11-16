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

//! 从操作系统及已安装的设备驱动读取硬件遥测数据。

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub(crate) use self::windows::{adapter_id, adapters, cpu_clocks, gpu_temperatures, temperatures};

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Temperature {
    pub category: &'static str,
    pub label: String,
    pub temperature_celsius: f64,
}

pub(crate) fn valid_temperature(value: f64) -> Option<f64> {
    (value.is_finite() && value > 0. && value <= 200.).then_some(value)
}

#[cfg(any(windows, test))]
fn temperature(category: &'static str, label: String, value: f64) -> Option<Temperature> {
    Some(Temperature {
        category,
        label,
        temperature_celsius: valid_temperature(value)?,
    })
}

#[cfg(any(windows, test))]
fn thermal_zone_category(label: &str) -> &'static str {
    if label.to_ascii_lowercase().contains("cpu") {
        "cpu"
    } else {
        // 固件常提供 TZ00 之类的标识，无法据此判断为 CPU 传感器。
        "system"
    }
}

#[cfg(not(windows))]
pub(crate) fn temperatures() -> Vec<Temperature> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifies_named_cpu_zones_and_rejects_invalid_sensor_values() {
        assert_eq!(thermal_zone_category(r"ACPI\ThermalZone\TZ00_0"), "system");
        assert_eq!(thermal_zone_category("CPU Package"), "cpu");
        assert!(temperature("cpu", String::new(), 58.1).is_some());
        for unavailable in [0., 201., -1., f64::NAN, f64::INFINITY] {
            assert!(temperature("cpu", String::new(), unavailable).is_none());
        }
    }
}
