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

use crate::shared::geometry::Rect;
use tauri::WebviewWindow;

/// Clip the reserved backing canvas to the currently visible island in device pixels.
#[cfg(windows)]
pub fn clip(window: &WebviewWindow, backing: Rect, visible: Rect) -> Result<(), String> {
    use windows_sys::Win32::{
        Foundation::HWND,
        Graphics::Gdi::{CreateRectRgn, DeleteObject, SetWindowRgn},
    };
    let factor = window.scale_factor().map_err(|e| e.to_string())?;
    let left = ((backing.width - visible.width) * factor / 2.).round() as i32;
    let right = left + (visible.width * factor).round() as i32;
    let bottom = (visible.height * factor).round() as i32;
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as HWND;
    unsafe {
        let region = CreateRectRgn(left, 0, right, bottom);
        if region.is_null() {
            return Err("CreateRectRgn failed".into());
        }
        if SetWindowRgn(hwnd, region, 1) == 0 {
            DeleteObject(region);
            return Err("SetWindowRgn failed".into());
        }
        // The system owns the region after SetWindowRgn succeeds.
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn clip(_window: &WebviewWindow, _backing: Rect, _visible: Rect) -> Result<(), String> {
    Ok(())
}

/// Raise the island within its selected stacking layer without stealing keyboard focus.
#[cfg(windows)]
pub fn raise(window: &WebviewWindow, topmost: bool) -> Result<(), String> {
    use windows_sys::Win32::{
        Foundation::HWND,
        UI::WindowsAndMessaging::{
            SetWindowPos, HWND_TOP, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        },
    };
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as HWND;
    let result = unsafe {
        SetWindowPos(
            hwnd,
            if topmost { HWND_TOPMOST } else { HWND_TOP },
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        )
    };
    if result == 0 {
        Err("Failed to raise island window".into())
    } else {
        Ok(())
    }
}
#[cfg(not(windows))]
pub fn raise(_window: &WebviewWindow, _topmost: bool) -> Result<(), String> {
    Ok(())
}
