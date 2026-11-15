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

//! WMI handles built-in panels and DXVA2 handles external DDC/CI monitors.

use crate::infrastructure::platform::ComApartment;
use std::ptr::{null, null_mut};
use windows::{
    core::{w, BSTR, PCWSTR},
    Win32::System::{
        Com::{
            CoCreateInstance, CoSetProxyBlanket, CLSCTX_INPROC_SERVER, EOAC_NONE,
            RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE,
        },
        Rpc::{RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE},
        Variant::VARIANT,
        Wmi::{
            IWbemClassObject, IWbemLocator, IWbemServices, WbemLocator,
            WBEM_FLAG_CONNECT_USE_MAX_WAIT, WBEM_FLAG_FORWARD_ONLY, WBEM_FLAG_RETURN_IMMEDIATELY,
            WBEM_GENERIC_FLAG_TYPE,
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

fn wmi<T>(operation: impl FnOnce(&IWbemServices) -> Option<T>) -> Option<T> {
    let _apartment = ComApartment::enter()?;
    unsafe {
        let locator: IWbemLocator =
            CoCreateInstance(&WbemLocator, None, CLSCTX_INPROC_SERVER).ok()?;
        let empty = BSTR::new();
        let service = locator
            .ConnectServer(
                &BSTR::from(r"root\wmi"),
                &empty,
                &empty,
                &empty,
                WBEM_FLAG_CONNECT_USE_MAX_WAIT.0,
                &empty,
                None,
            )
            .ok()?;
        CoSetProxyBlanket(
            &service,
            RPC_C_AUTHN_WINNT,
            RPC_C_AUTHZ_NONE,
            None,
            RPC_C_AUTHN_LEVEL_CALL,
            RPC_C_IMP_LEVEL_IMPERSONATE,
            None,
            EOAC_NONE,
        )
        .ok()?;
        operation(&service)
    }
}

fn first_instance(service: &IWbemServices, query: &str) -> Option<IWbemClassObject> {
    let mut entry = [None];
    let mut count = 0;
    unsafe {
        let cursor = service
            .ExecQuery(
                &BSTR::from("WQL"),
                &BSTR::from(query),
                WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                None,
            )
            .ok()?;
        cursor
            .Next(WMI_TIMEOUT_MS, &mut entry, &mut count)
            .ok()
            .ok()?;
    }
    entry[0].take()
}

fn property(entry: &IWbemClassObject, name: PCWSTR) -> Option<VARIANT> {
    let mut value = VARIANT::default();
    unsafe { entry.Get(name, 0, &mut value, None, None).ok()? };
    Some(value)
}

fn set_wmi(service: &IWbemServices, percent: u8) -> Option<()> {
    let panel = first_instance(
        service,
        "SELECT * FROM WmiMonitorBrightnessMethods WHERE Active = TRUE",
    )?;
    let path = BSTR::try_from(&property(&panel, w!("__RELPATH"))?).ok()?;
    let mut class = None;
    let mut signature = None;
    let mut result = None;
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
        // WMI represents CIM_UINT32 properties with VT_I4.
        input.Put(w!("Timeout"), 0, &VARIANT::from(0i32), 0).ok()?;
        service
            .ExecMethod(
                &path,
                &BSTR::from("WmiSetBrightness"),
                WBEM_FLAG_RETURN_IMMEDIATELY,
                None,
                &input,
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
        // EnumDisplayMonitors invokes this callback synchronously with our vector pointer.
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

pub(crate) fn get() -> Option<u8> {
    wmi(|service| {
        let panel = first_instance(
            service,
            "SELECT CurrentBrightness FROM WmiMonitorBrightness WHERE Active = TRUE",
        )?;
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

pub(crate) fn set(percent: u8) -> bool {
    if wmi(|service| set_wmi(service, percent)).is_some() {
        return true;
    }
    let mut updated = false;
    for group in monitors() {
        for monitor in &group.0 {
            let Some((min, _, max)) = monitor_range(monitor.hPhysicalMonitor) else {
                continue;
            };
            let value =
                min + (f64::from(percent) * f64::from(max - min) / 100.).round_ties_even() as u32;
            updated |= unsafe { SetMonitorBrightness(monitor.hPhysicalMonitor, value) } != 0;
        }
    }
    updated
}
