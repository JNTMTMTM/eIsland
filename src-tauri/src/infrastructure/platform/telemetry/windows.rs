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

//! Windows 时钟频率、ACPI 温区、WDDM 显卡温度与存储传感器。

use super::{temperature, thermal_zone_category, valid_temperature, Temperature};
use crate::infrastructure::platform::wmi::{instances, property, with_service};
use std::{
    collections::BTreeMap,
    mem::{offset_of, size_of},
    os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle},
    ptr::{null, null_mut},
};
use windows::{
    core::{w, BSTR},
    Win32::{
        Foundation::LUID,
        Graphics::Dxgi::{
            CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_DESC1, DXGI_ADAPTER_FLAG_SOFTWARE,
        },
    },
};
use windows_sys::{
    Wdk::Graphics::Direct3D::{
        D3DKMTCloseAdapter, D3DKMTOpenAdapterFromLuid, D3DKMTQueryAdapterInfo,
        D3DKMT_ADAPTER_PERFDATA, D3DKMT_CLOSEADAPTER, D3DKMT_OPENADAPTERFROMLUID,
        D3DKMT_QUERYADAPTERINFO, KMTQAITYPE_ADAPTERPERFDATA,
    },
    Win32::{
        Devices::DeviceAndDriverInstallation::{
            CM_Get_Device_Interface_ListW, CM_Get_Device_Interface_List_SizeW,
            CM_GET_DEVICE_INTERFACE_LIST_PRESENT, CR_BUFFER_SMALL, CR_SUCCESS,
        },
        Foundation::INVALID_HANDLE_VALUE,
        Storage::FileSystem::{CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING},
        System::{
            Ioctl::{
                PropertyStandardQuery, StorageAdapterTemperatureProperty,
                StorageDeviceTemperatureProperty, GUID_DEVINTERFACE_DISK,
                IOCTL_STORAGE_QUERY_PROPERTY, STORAGE_PROPERTY_ID, STORAGE_PROPERTY_QUERY,
                STORAGE_TEMPERATURE_DATA_DESCRIPTOR, STORAGE_TEMPERATURE_INFO,
            },
            Power::{CallNtPowerInformation, ProcessorInformation, PROCESSOR_POWER_INFORMATION},
            Threading::{GetActiveProcessorCount, ALL_PROCESSOR_GROUPS},
            IO::DeviceIoControl,
        },
    },
};

pub(crate) fn cpu_clocks() -> Vec<u32> {
    let count = unsafe { GetActiveProcessorCount(ALL_PROCESSOR_GROUPS) };
    let Some(bytes) = count.checked_mul(size_of::<PROCESSOR_POWER_INFORMATION>() as u32) else {
        return Vec::new();
    };
    if count == 0 {
        return Vec::new();
    }
    let mut output = vec![PROCESSOR_POWER_INFORMATION::default(); count as usize];
    if unsafe {
        CallNtPowerInformation(
            ProcessorInformation,
            null(),
            0,
            output.as_mut_ptr().cast(),
            bytes,
        )
    } != 0
    {
        return Vec::new();
    }
    let mut mhz = output
        .into_iter()
        .map(|info| info.MaxMhz)
        .filter(|value| *value > 0)
        .collect::<Vec<_>>();
    mhz.sort_unstable();
    mhz.dedup();
    mhz
}

fn acpi_temperatures() -> Vec<Temperature> {
    with_service(|service| {
        let values = instances(
            service,
            "SELECT InstanceName, CurrentTemperature FROM MSAcpi_ThermalZoneTemperature",
        )
        .iter()
        .filter_map(|zone| {
            let label = BSTR::try_from(&property(zone, w!("InstanceName"))?)
                .ok()?
                .to_string();
            let sensor = label.rsplit('\\').next().unwrap_or(&label);
            let tenths_kelvin = u32::try_from(&property(zone, w!("CurrentTemperature"))?).ok()?;
            let category = thermal_zone_category(sensor);
            temperature(category, label, f64::from(tenths_kelvin) / 10. - 273.15)
        })
        .collect();
        Some(values)
    })
    .unwrap_or_default()
}

pub(crate) fn adapters() -> Vec<DXGI_ADAPTER_DESC1> {
    let Ok(factory) = (unsafe { CreateDXGIFactory1::<IDXGIFactory1>() }) else {
        return Vec::new();
    };
    (0..)
        .map_while(|index| unsafe { factory.EnumAdapters1(index) }.ok())
        .filter_map(|adapter| unsafe { adapter.GetDesc1() }.ok())
        .filter(|info| info.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 == 0)
        .collect()
}

pub(crate) fn adapter_id(luid: LUID) -> String {
    format!("luid_0x{:08x}_0x{:08x}", luid.HighPart as u32, luid.LowPart)
}

struct Adapter(u32);

impl Drop for Adapter {
    fn drop(&mut self) {
        unsafe { D3DKMTCloseAdapter(&D3DKMT_CLOSEADAPTER { hAdapter: self.0 }) };
    }
}

fn gpu_temperature(luid: LUID) -> Option<f64> {
    let mut open = D3DKMT_OPENADAPTERFROMLUID {
        AdapterLuid: windows_sys::Win32::Foundation::LUID {
            LowPart: luid.LowPart,
            HighPart: luid.HighPart,
        },
        ..Default::default()
    };
    if unsafe { D3DKMTOpenAdapterFromLuid(&mut open) } != 0 {
        return None;
    }
    let adapter = Adapter(open.hAdapter);
    let mut result = D3DKMT_ADAPTER_PERFDATA::default();
    let mut query = D3DKMT_QUERYADAPTERINFO {
        hAdapter: adapter.0,
        Type: KMTQAITYPE_ADAPTERPERFDATA,
        pPrivateDriverData: (&mut result as *mut D3DKMT_ADAPTER_PERFDATA).cast(),
        PrivateDriverDataSize: size_of::<D3DKMT_ADAPTER_PERFDATA>() as u32,
    };
    if unsafe { D3DKMTQueryAdapterInfo(&mut query) } != 0 {
        return None;
    }
    // WDDM 的 Temperature 字段单位为 0.1 摄氏度（d3dkmthk.h：deci-Celsius）。
    valid_temperature(f64::from(result.Temperature) / 10.)
}

pub(crate) fn gpu_temperatures() -> BTreeMap<String, f64> {
    adapters()
        .into_iter()
        .filter_map(|info| {
            Some((
                adapter_id(info.AdapterLuid),
                gpu_temperature(info.AdapterLuid)?,
            ))
        })
        .collect()
}

fn disk_interfaces() -> Vec<u16> {
    // 查询大小与读取数据之间若发生热插拔，缓冲区长度可能失效。
    for _ in 0..3 {
        let mut size = 0;
        let status = unsafe {
            CM_Get_Device_Interface_List_SizeW(
                &mut size,
                &GUID_DEVINTERFACE_DISK,
                null(),
                CM_GET_DEVICE_INTERFACE_LIST_PRESENT,
            )
        };
        if status != CR_SUCCESS || size <= 1 || size > 65536 {
            break;
        }
        let mut buffer = vec![0; size as usize];
        let status = unsafe {
            CM_Get_Device_Interface_ListW(
                &GUID_DEVINTERFACE_DISK,
                null(),
                buffer.as_mut_ptr(),
                size,
                CM_GET_DEVICE_INTERFACE_LIST_PRESENT,
            )
        };
        match status {
            CR_SUCCESS => return buffer,
            CR_BUFFER_SMALL => continue,
            _ => break,
        }
    }
    Vec::new()
}

fn disk_temperatures(path: &[u16], disk: usize) -> Vec<Temperature> {
    // 两次查询均为只读，无需申请写权限。
    let handle = unsafe {
        CreateFileW(
            path.as_ptr(),
            0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            null(),
            OPEN_EXISTING,
            0,
            null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Vec::new();
    }
    let handle = unsafe { OwnedHandle::from_raw_handle(handle) };
    for property in [
        StorageDeviceTemperatureProperty,
        StorageAdapterTemperatureProperty,
    ] {
        let readings = read_disk_sensors(&handle, property, disk);
        if !readings.is_empty() {
            return readings;
        }
    }
    Vec::new()
}

fn read_disk_sensors(
    handle: &OwnedHandle,
    property: STORAGE_PROPERTY_ID,
    disk: usize,
) -> Vec<Temperature> {
    let query = STORAGE_PROPERTY_QUERY {
        PropertyId: property,
        QueryType: PropertyStandardQuery,
        ..Default::default()
    };
    let mut output = [0u8; 4096];
    let mut received = 0;
    let status = unsafe {
        DeviceIoControl(
            handle.as_raw_handle(),
            IOCTL_STORAGE_QUERY_PROPERTY,
            (&query as *const STORAGE_PROPERTY_QUERY).cast(),
            size_of::<STORAGE_PROPERTY_QUERY>() as u32,
            output.as_mut_ptr().cast(),
            output.len() as u32,
            &mut received,
            null_mut(),
        )
    };
    match (status != 0, output.get(..received as usize)) {
        (true, Some(payload)) => parse_disk_sensors(payload, disk),
        _ => Vec::new(),
    }
}

fn parse_disk_sensors(bytes: &[u8], disk: usize) -> Vec<Temperature> {
    const HEADER: usize = offset_of!(STORAGE_TEMPERATURE_DATA_DESCRIPTOR, TemperatureInfo);
    const ENTRY: usize = size_of::<STORAGE_TEMPERATURE_INFO>();
    if bytes.len() < HEADER {
        return Vec::new();
    }
    let size = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    let count = u16::from_le_bytes(bytes[12..14].try_into().unwrap()) as usize;
    if size > bytes.len() || size < HEADER + count * ENTRY {
        return Vec::new();
    }
    bytes[HEADER..HEADER + count * ENTRY]
        .as_chunks::<ENTRY>()
        .0
        .iter()
        .filter_map(|sensor| {
            let index = u16::from_le_bytes(sensor[..2].try_into().unwrap());
            let celsius = i16::from_le_bytes(sensor[2..4].try_into().unwrap());
            temperature(
                "storage",
                format!("Disk {disk} sensor {index}"),
                f64::from(celsius),
            )
        })
        .collect()
}

pub(crate) fn temperatures() -> Vec<Temperature> {
    let mut readings = acpi_temperatures();
    for (index, disk) in disk_interfaces()
        .split_inclusive(|unit| *unit == 0)
        .take_while(|item| item.len() > 1 && item.last() == Some(&0))
        .enumerate()
    {
        readings.extend(disk_temperatures(disk, index));
    }
    readings
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn storage_descriptor_ignores_thresholds_and_rejects_truncation() {
        const HEADER: usize = offset_of!(STORAGE_TEMPERATURE_DATA_DESCRIPTOR, TemperatureInfo);
        const ENTRY: usize = size_of::<STORAGE_TEMPERATURE_INFO>();
        let mut descriptor = [0; HEADER + 2 * ENTRY];
        let size = descriptor.len() as u32;
        descriptor[4..8].copy_from_slice(&size.to_le_bytes());
        descriptor[12..14].copy_from_slice(&2u16.to_le_bytes());
        descriptor[HEADER + 2..HEADER + 4].copy_from_slice(&38i16.to_le_bytes());
        descriptor[HEADER + 4..HEADER + 6].copy_from_slice(&85i16.to_le_bytes());
        descriptor[HEADER + ENTRY + 2..HEADER + ENTRY + 4].copy_from_slice(&i16::MIN.to_le_bytes());
        let readings = parse_disk_sensors(&descriptor, 0);
        assert_eq!(readings.len(), 1);
        assert_eq!(readings[0].temperature_celsius, 38.);
        assert!(parse_disk_sensors(&descriptor[..HEADER + ENTRY], 0).is_empty());
    }
}
