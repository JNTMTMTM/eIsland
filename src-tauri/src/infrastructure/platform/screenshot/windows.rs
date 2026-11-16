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

//! 使用 Win32 GDI 截取主屏或整个虚拟桌面。

use crate::shared::Result;
use image::RgbaImage;
use std::{mem::size_of, ptr::null_mut};
use windows_sys::Win32::{
    Graphics::Gdi::{
        BitBlt, CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, GdiFlush, GetDC,
        ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, CAPTUREBLT, DIB_RGB_COLORS,
        HBITMAP, HDC, SRCCOPY,
    },
    UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CXSCREEN, SM_CXVIRTUALSCREEN, SM_CYSCREEN, SM_CYVIRTUALSCREEN,
        SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
    },
};

#[derive(Default)]
struct CaptureHandles {
    screen: HDC,
    memory: HDC,
    bitmap: HBITMAP,
}

impl Drop for CaptureHandles {
    fn drop(&mut self) {
        unsafe {
            // 销毁内存 DC 后，位图已不再被任何 DC 选中。
            if !self.memory.is_null() {
                DeleteDC(self.memory);
            }
            if !self.bitmap.is_null() {
                DeleteObject(self.bitmap);
            }
            if !self.screen.is_null() {
                ReleaseDC(null_mut(), self.screen);
            }
        }
    }
}

/// 读取屏幕物理像素，虚拟桌面可以有负坐标。
pub(crate) fn capture(all: bool) -> Result<(i32, i32, RgbaImage)> {
    let (x, y, width, height) = unsafe {
        if all {
            (
                GetSystemMetrics(SM_XVIRTUALSCREEN),
                GetSystemMetrics(SM_YVIRTUALSCREEN),
                GetSystemMetrics(SM_CXVIRTUALSCREEN),
                GetSystemMetrics(SM_CYVIRTUALSCREEN),
            )
        } else {
            (
                0,
                0,
                GetSystemMetrics(SM_CXSCREEN),
                GetSystemMetrics(SM_CYSCREEN),
            )
        }
    };
    let pixels = i64::from(width) * i64::from(height);
    if width <= 0 || height <= 0 || pixels > 32 * 1024 * 1024 {
        return Err(format!("Invalid GDI capture dimensions ({width}x{height})"));
    }

    let mut handles = CaptureHandles {
        screen: unsafe { GetDC(null_mut()) },
        ..Default::default()
    };
    if handles.screen.is_null() {
        return Err("GetDC failed for screen capture".into());
    }
    handles.memory = unsafe { CreateCompatibleDC(handles.screen) };
    if handles.memory.is_null() {
        return Err("CreateCompatibleDC failed for screen capture".into());
    }

    let mut bits = null_mut();
    let info = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width,
            biHeight: -height,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB,
            ..Default::default()
        },
        ..Default::default()
    };
    handles.bitmap = unsafe {
        CreateDIBSection(
            handles.screen,
            &info,
            DIB_RGB_COLORS,
            &mut bits,
            null_mut(),
            0,
        )
    };
    if handles.bitmap.is_null() || bits.is_null() {
        return Err("CreateDIBSection failed for screen capture".into());
    }

    let previous = unsafe { SelectObject(handles.memory, handles.bitmap) };
    if previous.is_null() || previous as isize == -1 {
        return Err("SelectObject failed for screen capture".into());
    }
    let copied = unsafe {
        BitBlt(
            handles.memory,
            0,
            0,
            width,
            height,
            handles.screen,
            x,
            y,
            SRCCOPY | CAPTUREBLT,
        )
    };
    let flushed = unsafe { GdiFlush() };
    if copied == 0 || flushed == 0 {
        return Err("BitBlt failed for screen capture".into());
    }

    // GdiFlush 完成后才能读取 DIB。保留缓冲区期间 DC 和位图仍然有效。
    let bgra = unsafe { std::slice::from_raw_parts(bits.cast::<u8>(), pixels as usize * 4) };
    let mut rgba = bgra.to_vec();
    for pixel in rgba.as_chunks_mut::<4>().0 {
        pixel.swap(0, 2);
        pixel[3] = 255;
    }
    let image = RgbaImage::from_raw(width as u32, height as u32, rgba)
        .ok_or("Invalid GDI capture buffer")?;
    Ok((x, y, image))
}
