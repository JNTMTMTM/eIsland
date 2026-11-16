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

//! Windows 亮度控制：WMI 负责内置屏，DXVA2 负责支持 DDC/CI 的外接显示器。

use crate::infrastructure::platform::wmi::{instances, property, with_service};
use std::ptr::{null, null_mut};
use windows::{
    core::{w, BSTR},
    Win32::System::{
        Variant::VARIANT,
        Wmi::{
            IWbemClassObject, IWbemServices, WBEM_FLAG_RETURN_IMMEDIATELY, WBEM_GENERIC_FLAG_TYPE,
        },
    },
};
use windows_sys::Win32::{
    Devices::Display::{
        DestroyPhysicalMonitor, GetMonitorBrightness, GetNumberOfPhysicalMonitorsFromHMONITOR,
        GetPhysicalMonitorsFromHMONITOR, SetMonitorBrightness, PHYSICAL_MONITOR,
    },
    Foundation::{HANDLE, LPARAM, RECT},
    Graphics::Gdi::{EnumDisplayMonitors, HDC, HMONITOR},
};

const WMI_TIMEOUT_MS: i32 = 1000;
const METHODS: &str = "WmiMonitorBrightnessMethods";

/// 向全部活动的 WMI 内置屏写入亮度，按面板返回各自是否成功。
fn set_wmi(service: &IWbemServices, percent: u8) -> Vec<bool> {
    let panels = instances(
        service,
        "SELECT * FROM WmiMonitorBrightnessMethods WHERE Active = TRUE",
    );
    if panels.is_empty() {
        return Vec::new();
    }
    let Some(input) = wmi_input(service, percent) else {
        return vec![false; panels.len()];
    };
    panels
        .iter()
        .map(|panel| wmi_invoke(service, panel, &input).is_some())
        .collect()
}

fn wmi_input(service: &IWbemServices, percent: u8) -> Option<IWbemClassObject> {
    let mut class = None;
    let mut signature = None;
    unsafe {
        service
            .GetObject(
                &BSTR::from(METHODS),
                WBEM_GENERIC_FLAG_TYPE(0),
                None,
                Some(&mut class),
                None,
            )
            .ok()?;
        class?
            .GetMethod(w!("WmiSetBrightness"), 0, &mut signature, null_mut())
            .ok()?;
        let input = signature?.SpawnInstance(0).ok()?;
        input
            .Put(w!("Brightness"), 0, &VARIANT::from(percent), 0)
            .ok()?;
        // WMI 以 VT_I4 承载 CIM_UINT32 属性。
        input.Put(w!("Timeout"), 0, &VARIANT::from(0i32), 0).ok()?;
        Some(input)
    }
}

fn wmi_invoke(
    service: &IWbemServices,
    panel: &IWbemClassObject,
    input: &IWbemClassObject,
) -> Option<()> {
    let path = BSTR::try_from(&property(panel, w!("__RELPATH"))?).ok()?;
    let mut result = None;
    unsafe {
        service
            .ExecMethod(
                &path,
                &BSTR::from("WmiSetBrightness"),
                WBEM_FLAG_RETURN_IMMEDIATELY,
                None,
                input,
                None,
                Some(&mut result),
            )
            .ok()?;
        let output = result?.GetResultObject(WMI_TIMEOUT_MS).ok()?;
        (u32::try_from(&property(&output, w!("ReturnValue"))?).ok()? == 0).then_some(())
    }
}

struct PhysicalMonitors(Vec<PHYSICAL_MONITOR>);

impl PhysicalMonitors {
    fn open(monitor: HMONITOR) -> Option<Self> {
        let mut count = 0;
        unsafe {
            if GetNumberOfPhysicalMonitorsFromHMONITOR(monitor, &mut count) == 0 || count == 0 {
                return None;
            }
            let mut entries = Self(vec![PHYSICAL_MONITOR::default(); count as usize]);
            (GetPhysicalMonitorsFromHMONITOR(monitor, count, entries.0.as_mut_ptr()) != 0)
                .then_some(entries)
        }
    }
}

impl Drop for PhysicalMonitors {
    fn drop(&mut self) {
        for monitor in &self.0 {
            if !monitor.hPhysicalMonitor.is_null() {
                unsafe { DestroyPhysicalMonitor(monitor.hPhysicalMonitor) };
            }
        }
    }
}

fn monitors() -> impl Iterator<Item = PhysicalMonitors> {
    unsafe extern "system" fn collect(
        monitor: HMONITOR,
        _: HDC,
        _: *mut RECT,
        data: LPARAM,
    ) -> i32 {
        // EnumDisplayMonitors 同步调用此回调，data 指向下方的 displays 向量。
        unsafe { &mut *(data as *mut Vec<HMONITOR>) }.push(monitor);
        1
    }
    let mut displays = Vec::<HMONITOR>::new();
    unsafe {
        EnumDisplayMonitors(
            null_mut(),
            null(),
            Some(collect),
            (&mut displays as *mut Vec<HMONITOR>) as LPARAM,
        )
    };
    displays.into_iter().filter_map(PhysicalMonitors::open)
}

fn monitor_range(handle: HANDLE) -> Option<(u32, u32, u32)> {
    let (mut minimum, mut current, mut maximum) = (0, 0, 0);
    let ok = unsafe { GetMonitorBrightness(handle, &mut minimum, &mut current, &mut maximum) };
    (ok != 0 && minimum <= maximum).then_some((minimum, current, maximum))
}

/// 读取当前亮度
/// @description 优先读取首个活动的 WMI 内置屏，否则读取首个可读的 DDC/CI 外接显示器。
/// @returns 亮度百分比（0~100）；没有可读显示器时返回 `None`
pub(crate) fn get() -> Option<u8> {
    with_service(|service| {
        let panel = instances(
            service,
            "SELECT CurrentBrightness FROM WmiMonitorBrightness WHERE Active = TRUE",
        )
        .into_iter()
        .next()?;
        let value = u32::try_from(&property(&panel, w!("CurrentBrightness"))?).ok()?;
        Some(value.min(100) as u8)
    })
    .or_else(|| {
        monitors().find_map(|group| {
            group.0.iter().find_map(|monitor| {
                let (min, current, max) = monitor_range(monitor.hPhysicalMonitor)?;
                Some(if min == max {
                    0
                } else {
                    (f64::from(current.clamp(min, max) - min) * 100. / f64::from(max - min))
                        .round_ties_even() as u8
                })
            })
        })
    })
}

/// 将亮度写入全部支持亮度调节的显示器
/// @description WMI 内置屏与 DXVA2 外接显示器都会写入；不支持亮度调节的显示器跳过，不计为失败。
/// @param percent - 目标亮度百分比（0~100）
/// @returns 至少有一台可调显示器且全部写入成功时为 `true`；部分失败或无可调显示器时为 `false`
pub(crate) fn set(percent: u8) -> bool {
    let mut outcomes = with_service(|service| Some(set_wmi(service, percent))).unwrap_or_default();
    for group in monitors() {
        for monitor in &group.0 {
            let Some((min, _, max)) = monitor_range(monitor.hPhysicalMonitor) else {
                continue;
            };
            let value =
                min + (f64::from(percent) * f64::from(max - min) / 100.).round_ties_even() as u32;
            outcomes.push(unsafe { SetMonitorBrightness(monitor.hPhysicalMonitor, value) } != 0);
        }
    }
    !outcomes.is_empty() && outcomes.into_iter().all(|updated| updated)
}
