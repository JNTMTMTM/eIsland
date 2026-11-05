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

mod hardware;

mod performance;

#[cfg(debug_assertions)]
pub(crate) use performance::diagnostics as performance_diagnostics;

use crate::shared::Result;
use serde_json::{json, Value};
use std::{
    path::Path,
    sync::{Mutex, OnceLock},
};
use sysinfo::{Disks, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use tauri::AppHandle;

static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();
pub fn handles(channel: &str) -> bool {
    hardware::handles(channel)
        || matches!(
            channel,
            "system:open-task-manager"
                | "system:running-processes:get"
                | "system:running-processes:with-icons:get"
                | "system:open-windows:with-icons:get"
                | "system:focused-window:get"
                | "system:performance-snapshot:get"
        )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    if hardware::handles(channel) {
        return hardware::handle(app, channel, args).await;
    }
    let app = app.clone();
    let channel = channel.to_owned();
    let args = args.to_vec();
    let metrics = if channel == "system:performance-snapshot:get" {
        performance::sample(&app)
    } else {
        Value::Null
    };
    tauri::async_runtime::spawn_blocking(move || {
        let mut value = work(&app, &channel, &args)?;
        if channel == "system:performance-snapshot:get" {
            performance::augment(&mut value, &metrics, args.first().unwrap_or(&Value::Null));
        }
        Ok(value)
    })
    .await
    .map_err(|e| e.to_string())?
}
pub fn start(app: &AppHandle) {
    hardware::start(app);
}
pub fn stop(app: &AppHandle) {
    hardware::stop(app);
    performance::stop();
}
fn work(_app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    if channel == "system:open-task-manager" {
        #[cfg(windows)]
        {
            let mut command = crate::infrastructure::child_process::external_command("taskmgr.exe");
            command.spawn().map_err(|e| e.to_string())?;
        }
        return Ok(Value::Null);
    }
    let mut system = SYSTEM
        .get_or_init(|| Mutex::new(System::new()))
        .lock()
        .unwrap();
    if channel == "system:performance-snapshot:get" {
        system.refresh_cpu_all();
        system.refresh_memory();
        let selected = args.first().unwrap_or(&Value::Null);
        let include = args.get(1) != Some(&json!(false));
        let cpu = system.cpus().first();
        let index = selected["cpu"]
            .as_str()
            .and_then(|s| s.rsplit([':', '-']).next())
            .and_then(|s| s.parse::<usize>().ok());
        let load = index
            .and_then(|i| system.cpus().get(i))
            .map(|c| c.cpu_usage())
            .unwrap_or(system.global_cpu_usage());
        let disks = Disks::new_with_refreshed_list();
        let selected_disk = selected["disk"]
            .as_str()
            .and_then(|s| s.rsplit([':', '-']).next())
            .and_then(|s| s.parse::<usize>().ok());
        let mut total = 0u64;
        let mut available = 0u64;
        let mut disk_options = vec![json!({"id":"all","label":"All Disks"})];
        for (index, disk) in disks.list().iter().enumerate() {
            if selected_disk.is_none() || selected_disk == Some(index) {
                total += disk.total_space();
                available += disk.available_space();
            }
            if include {
                disk_options.push(json!({"id":format!("fs:{index}"),"label":disk.mount_point().to_string_lossy()}));
            }
        }
        let mut cpu_options = vec![json!({"id":"all","label":"All CPU"})];
        if include {
            cpu_options.extend(system.cpus().iter().enumerate().map(|(i,c)|json!({"id":format!("cpu:{i}"),"label":format!("CPU {} · {}",i+1,c.brand())})));
        }
        let inventory = gpus();
        let selected_gpu = selected["gpu"]
            .as_str()
            .and_then(|v| v.strip_prefix("gpu:"))
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(0);
        let gpu = inventory
            .get(selected_gpu)
            .or_else(|| inventory.first())
            .cloned()
            .unwrap_or(Value::Null);
        let mut gpu_options = Vec::new();
        if include {
            gpu_options.push(json!({"id":"auto","label":"Auto GPU"}));
            gpu_options.extend(
                inventory.iter().enumerate().map(
                    |(index, item)| json!({"id":format!("gpu:{index}"),"label":item["model"]}),
                ),
            );
        }
        return Ok(
            json!({"timestamp":crate::shared::time::now_ms(),"host":{"hostname":System::host_name().unwrap_or_default(),"platform":if cfg!(windows){"win32"}else if cfg!(target_os="macos"){"darwin"}else{std::env::consts::OS},"release":System::os_version().unwrap_or_default(),"arch":match std::env::consts::ARCH{"x86_64"=>"x64","x86"=>"ia32",arch=>arch},"uptimeSeconds":System::uptime()},"cpu":{"manufacturer":cpu.map(|c|c.vendor_id()).unwrap_or(""),"brand":cpu.map(|c|c.brand()).unwrap_or(""),"cores":system.cpus().len(),"physicalCores":System::physical_core_count().unwrap_or(system.cpus().len()),"speedGhz":cpu.map(|c|c.frequency()as f64/1000.),"speedMaxGhz":null,"loadPercent":load,"temperatureCelsius":null},"memory":{"totalBytes":system.total_memory(),"usedBytes":system.used_memory(),"availableBytes":system.available_memory(),"usagePercent":if system.total_memory()>0{system.used_memory()as f64/system.total_memory()as f64*100.}else{0.}},"gpu":gpu,"disk":{"totalBytes":total,"usedBytes":total.saturating_sub(available),"usagePercent":if total>0{(total-available)as f64/total as f64*100.}else{0.},"temperatureCelsius":null},"hardwareOptions":{"cpu":if include{cpu_options}else{Vec::new()},"gpu":gpu_options,"disk":if include{disk_options}else{Vec::new()}}}),
        );
    }
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet),
    );
    if matches!(
        channel,
        "system:focused-window:get" | "system:open-windows:with-icons:get"
    ) {
        let windows = xcap::Window::all().map_err(|e| e.to_string())?;
        let focused = channel == "system:focused-window:get";
        let mut values = Vec::new();
        for window in windows {
            if focused && !window.is_focused().unwrap_or(false) {
                continue;
            }
            let title = window.title().unwrap_or_default();
            if title.is_empty() {
                continue;
            }
            let pid = window.pid().unwrap_or(0);
            let process = system.process(sysinfo::Pid::from_u32(pid));
            let process_path = process.and_then(|p| p.exe());
            let icon = process_path
                .and_then(|p| file_icon(p).ok())
                .unwrap_or(Value::Null);
            values.push(json!({"id":window.id().unwrap_or(0).to_string(),"title":title,"processName":window.app_name().unwrap_or_default(),"processPath":process_path,"processId":pid,"iconDataUrl":icon.as_str().map(|s|format!("data:image/png;base64,{s}"))}));
        }
        return Ok(if focused {
            values.into_iter().next().unwrap_or(Value::Null)
        } else {
            json!(values)
        });
    }
    let mut processes = system
        .processes()
        .values()
        .filter(|p| p.exe().is_some() && p.pid().as_u32() != std::process::id())
        .collect::<Vec<_>>();
    processes.sort_by_key(|p| p.name().to_ascii_lowercase());
    processes.dedup_by(|a, b| a.name().eq_ignore_ascii_case(b.name()));
    if channel == "system:running-processes:get" {
        return Ok(json!(processes
            .iter()
            .map(|p| p.name().to_string_lossy())
            .collect::<Vec<_>>()));
    }
    Ok(json!(processes.iter().map(|p|{let icon=p.exe().and_then(|path|file_icon(path).ok()).unwrap_or(Value::Null);json!({"name":p.name().to_string_lossy(),"path":p.exe(),"processName":p.name().to_string_lossy(),"processPath":p.exe(),"processId":p.pid().as_u32(),"iconDataUrl":icon.as_str().map(|s|format!("data:image/png;base64,{s}"))})}).collect::<Vec<_>>()))
}
pub fn shortcut(path: &Path) -> Result<Value> {
    #[cfg(windows)]
    {
        let script="$s=(New-Object -ComObject WScript.Shell).CreateShortcut([string]$a.path);@{target=$s.TargetPath;name=[IO.Path]::GetFileNameWithoutExtension([string]$a.path)}";
        tauri::async_runtime::block_on(crate::infrastructure::child_process::powershell_json(
            script,
            &json!({"path":path}),
            crate::infrastructure::child_process::Options {
                timeout: std::time::Duration::from_secs(5),
                stdout_limit: 65536,
                ..Default::default()
            },
        ))
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Ok(Value::Null)
    }
}
pub fn set_wallpaper(app: &AppHandle, payload: &Value) -> Result<Value> {
    #[cfg(windows)]
    {
        let path = if payload["clear"] == true {
            String::new()
        } else if let Some(path) = payload["sourcePath"].as_str() {
            Path::new(path)
                .canonicalize()
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .into_owned()
        } else {
            return Err("Wallpaper requires a local source path".into());
        };
        let mut path = path.encode_utf16().chain(Some(0)).collect::<Vec<_>>();
        let success = unsafe {
            windows_sys::Win32::UI::WindowsAndMessaging::SystemParametersInfoW(
                windows_sys::Win32::UI::WindowsAndMessaging::SPI_SETDESKWALLPAPER,
                0,
                path.as_mut_ptr().cast(),
                windows_sys::Win32::UI::WindowsAndMessaging::SPIF_UPDATEINIFILE
                    | windows_sys::Win32::UI::WindowsAndMessaging::SPIF_SENDCHANGE,
            )
        } != 0;
        let _ = app;
        Ok(json!(success))
    }
    #[cfg(not(windows))]
    {
        let _ = (app, payload);
        Err("Desktop wallpaper control is available on Windows".into())
    }
}
pub fn file_icon(path: &Path) -> Result<Value> {
    #[cfg(windows)]
    {
        use base64::Engine;
        use windows::Win32::{
            Foundation::RPC_E_CHANGED_MODE,
            System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED},
        };
        use windows_sys::Win32::{
            Graphics::Gdi::*,
            UI::{Shell::*, WindowsAndMessaging::*},
        };
        // SHGetFileInfo requires COM on this thread, not just on the GUI thread.
        // Tokio blocking workers may be fresh or already belong to another apartment.
        struct Apartment(bool);
        impl Drop for Apartment {
            fn drop(&mut self) {
                if self.0 {
                    unsafe { CoUninitialize() };
                }
            }
        }
        let initialized = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        let _apartment = Apartment(initialized.is_ok());
        if initialized.is_err() && initialized != RPC_E_CHANGED_MODE {
            return Err(format!(
                "Cannot initialize COM for file icon: {initialized}"
            ));
        }
        let path = path
            .as_os_str()
            .to_string_lossy()
            .encode_utf16()
            .chain(Some(0))
            .collect::<Vec<_>>();
        let mut info = unsafe { std::mem::zeroed::<SHFILEINFOW>() };
        unsafe {
            SHGetFileInfoW(
                path.as_ptr(),
                0,
                &mut info,
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_SMALLICON,
            );
        }
        // Shell may return success with no HICON during concurrent cold lookups.
        // Executables and ICO files can use the native resource extractor directly.
        if info.hIcon.is_null() {
            unsafe {
                ExtractIconExW(path.as_ptr(), 0, std::ptr::null_mut(), &mut info.hIcon, 1);
            }
        }
        if info.hIcon.is_null() {
            return Ok(Value::Null);
        }
        let result = (|| {
            let dc = unsafe { GetDC(std::ptr::null_mut()) };
            let memory = unsafe { CreateCompatibleDC(dc) };
            let mut bits = std::ptr::null_mut();
            let bitmap_info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: 32,
                    biHeight: -32,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB,
                    ..unsafe { std::mem::zeroed() }
                },
                ..unsafe { std::mem::zeroed() }
            };
            let bitmap = unsafe {
                CreateDIBSection(
                    dc,
                    &bitmap_info,
                    DIB_RGB_COLORS,
                    &mut bits,
                    std::ptr::null_mut(),
                    0,
                )
            };
            if bitmap.is_null() || bits.is_null() {
                unsafe {
                    DeleteDC(memory);
                    ReleaseDC(std::ptr::null_mut(), dc);
                }
                return Err("Cannot allocate icon bitmap".into());
            }
            let old = unsafe { SelectObject(memory, bitmap.cast()) };
            let pixels = (|| -> Result<Vec<u8>> {
                unsafe { std::ptr::write_bytes(bits, 0, 32 * 32 * 4) };
                let draw = |flags| unsafe {
                    DrawIconEx(
                        memory,
                        0,
                        0,
                        info.hIcon,
                        32,
                        32,
                        0,
                        std::ptr::null_mut(),
                        flags,
                    )
                };
                if draw(DI_NORMAL) == 0 {
                    return Err(format!(
                        "Cannot render file icon: {}",
                        std::io::Error::last_os_error()
                    ));
                }
                let mut rgba =
                    unsafe { std::slice::from_raw_parts(bits.cast::<u8>(), 32 * 32 * 4) }.to_vec();
                for pixel in rgba.as_chunks_mut::<4>().0 {
                    pixel.swap(0, 2);
                }
                Ok(rgba)
            })();
            unsafe {
                SelectObject(memory, old);
                DeleteObject(bitmap.cast());
                DeleteDC(memory);
                ReleaseDC(std::ptr::null_mut(), dc);
            }
            let image = image::RgbaImage::from_raw(32, 32, pixels?).ok_or("Invalid icon image")?;
            let mut output = std::io::Cursor::new(Vec::new());
            image
                .write_to(&mut output, image::ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            Ok(json!(
                base64::engine::general_purpose::STANDARD.encode(output.into_inner())
            ))
        })();
        unsafe {
            DestroyIcon(info.hIcon);
        }
        result
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Ok(Value::Null)
    }
}

#[cfg(all(test, windows))]
mod icon_tests;

fn gpus() -> Vec<Value> {
    #[cfg(windows)]
    {
        use windows::Win32::Graphics::Dxgi::{
            CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE,
        };
        let Ok(factory) = (unsafe { CreateDXGIFactory1::<IDXGIFactory1>() }) else {
            return Vec::new();
        };
        let mut values = Vec::new();
        let mut index = 0;
        while let Ok(adapter) = unsafe { factory.EnumAdapters1(index) } {
            index += 1;
            let Ok(info) = (unsafe { adapter.GetDesc1() }) else {
                continue;
            };
            if info.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0 {
                continue;
            }
            let length = info
                .Description
                .iter()
                .position(|c| *c == 0)
                .unwrap_or(info.Description.len());
            let model = String::from_utf16_lossy(&info.Description[..length]);
            let vendor = match info.VendorId {
                0x10de => "NVIDIA",
                0x1002 => "AMD",
                0x8086 => "Intel",
                _ => "",
            };
            values.push(json!({"vendor":vendor,"model":model,"vramTotalMb":info.DedicatedVideoMemory/1048576,"loadPercent":null,"temperatureCelsius":null,"_luid":format!("luid_0x{:08x}_0x{:08x}",info.AdapterLuid.HighPart as u32,info.AdapterLuid.LowPart)}));
        }
        values
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}
