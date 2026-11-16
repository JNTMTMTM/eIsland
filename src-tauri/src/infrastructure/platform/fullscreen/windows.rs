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

//! Win32/DWM 全屏检测；只读取窗口元数据，不抓屏或加载原生插件。

use super::fills_display;
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, RECT},
    Graphics::{
        Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS},
        Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
    },
    UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetDesktopWindow, GetShellWindow, GetWindowLongPtrW,
        GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindowVisible, GWL_EXSTYLE, GWL_STYLE,
        WS_DISABLED, WS_EX_TOOLWINDOW,
    },
};

fn edges(rect: RECT) -> [f64; 4] {
    [
        rect.left as f64,
        rect.top as f64,
        rect.right as f64,
        rect.bottom as f64,
    ]
}

fn is_fullscreen(window: HWND, excluded_pid: u32) -> bool {
    unsafe {
        let mut pid = 0;
        if GetWindowThreadProcessId(window, &mut pid) == 0
            || pid == excluded_pid
            || IsWindowVisible(window) == 0
            || IsIconic(window) != 0
            || GetWindowLongPtrW(window, GWL_STYLE) as u32 & WS_DISABLED != 0
            || GetWindowLongPtrW(window, GWL_EXSTYLE) as u32 & WS_EX_TOOLWINDOW != 0
            || window == GetDesktopWindow()
            || window == GetShellWindow()
        {
            return false;
        }
        // 桌面和任务栏不属于全屏应用，按类名过滤，不依赖系统显示语言或标题。
        let mut class = [0u16; 128];
        let length = GetClassNameW(window, class.as_mut_ptr(), class.len() as i32);
        if length <= 0
            || matches!(
                String::from_utf16_lossy(&class[..length as usize]).as_str(),
                "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd"
            )
        {
            return false;
        }
        let mut cloaked = 0u32;
        if DwmGetWindowAttribute(
            window,
            DWMWA_CLOAKED as u32,
            std::ptr::from_mut(&mut cloaked).cast(),
            std::mem::size_of_val(&cloaked) as u32,
        ) >= 0
            && cloaked != 0
        {
            return false;
        }
        let mut bounds = RECT::default();
        if DwmGetWindowAttribute(
            window,
            DWMWA_EXTENDED_FRAME_BOUNDS as u32,
            std::ptr::from_mut(&mut bounds).cast(),
            std::mem::size_of_val(&bounds) as u32,
        ) < 0
            && GetWindowRect(window, &mut bounds) == 0
        {
            return false;
        }
        let monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        !monitor.is_null()
            && GetMonitorInfoW(monitor, &mut info) != 0
            && fills_display(edges(bounds), edges(info.rcMonitor))
    }
}

/// 枚举回调参数：排除的进程 ID 与是否已找到全屏窗口。
struct Search {
    excluded_pid: u32,
    found: bool,
}

unsafe extern "system" fn visit(window: HWND, parameter: LPARAM) -> i32 {
    let search = unsafe { &mut *(parameter as *mut Search) };
    search.found = is_fullscreen(window, search.excluded_pid);
    i32::from(!search.found)
}

/// 任一显示器存在其他进程的可见全屏窗口时返回 true；找到后立即停止枚举。
pub(crate) fn any() -> Result<bool, String> {
    any_except(std::process::id())
}

fn any_except(excluded_pid: u32) -> Result<bool, String> {
    let mut search = Search {
        excluded_pid,
        found: false,
    };
    let completed = unsafe { EnumWindows(Some(visit), std::ptr::from_mut(&mut search) as LPARAM) };
    let found = search.found;
    if completed == 0 && !found {
        return Err(format!(
            "EnumWindows failed: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(found)
}

#[cfg(test)]
mod tests;
