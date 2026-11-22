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

//! Pill 在窗口线程捕获鼠标，通过普通消息移动 HWND。

use std::cell::Cell;
use tauri::WebviewWindow;
use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, GetCapture, ReleaseCapture, SetCapture, VK_LBUTTON, VK_RBUTTON,
        },
        Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
        WindowsAndMessaging::{
            GetCursorPos, GetSystemMetrics, GetWindowRect, SetWindowPos, SM_SWAPBUTTON,
            SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER, WA_INACTIVE, WM_ACTIVATE, WM_CANCELMODE,
            WM_CAPTURECHANGED, WM_LBUTTONUP, WM_MOUSEMOVE, WM_NCDESTROY, WM_RBUTTONUP,
            WM_SHOWWINDOW,
        },
    },
};

const DRAG_SUBCLASS: usize = 1;

#[derive(Clone, Copy)]
struct Drag {
    window: HWND,
    offset: POINT,
}

thread_local! {
    static ACTIVE_DRAG: Cell<Option<Drag>> = const { Cell::new(None) };
}

fn primary_button_down() -> bool {
    let button = if unsafe { GetSystemMetrics(SM_SWAPBUTTON) } == 0 {
        VK_LBUTTON
    } else {
        VK_RBUTTON
    };
    unsafe { GetAsyncKeyState(i32::from(button)) < 0 }
}

/// 使用普通鼠标捕获跟随指针，避开标题栏的模态移动循环。
pub fn start_dragging(window: &WebviewWindow) -> Result<(), String> {
    if !primary_button_down() {
        return Ok(());
    }
    begin_drag(window.hwnd().map_err(|e| e.to_string())?.0 as HWND)
}

fn begin_drag(hwnd: HWND) -> Result<(), String> {
    let mut cursor = POINT { x: 0, y: 0 };
    let mut bounds = RECT::default();
    if unsafe { GetCursorPos(&mut cursor) == 0 || GetWindowRect(hwnd, &mut bounds) == 0 } {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let offset = POINT {
        x: bounds.left - cursor.x,
        y: bounds.top - cursor.y,
    };
    install_drag(hwnd, offset)?;
    unsafe { SetCapture(hwnd) };
    if unsafe { GetCapture() } != hwnd {
        finish_drag(hwnd);
        return Err("Pill window could not capture the mouse".into());
    }
    Ok(())
}

/// 形态切换先释放拖动，随后读取归位动画的起点。
pub fn cancel_dragging(window: &WebviewWindow) {
    if let Ok(handle) = window.hwnd() {
        finish_drag(handle.0 as HWND);
    }
}

fn install_drag(window: HWND, offset: POINT) -> Result<(), String> {
    if unsafe { SetWindowSubclass(window, Some(drag_message), DRAG_SUBCLASS, 0) } == 0 {
        return Err("Could not subclass the Pill window for dragging".into());
    }
    ACTIVE_DRAG.set(Some(Drag { window, offset }));
    Ok(())
}

fn finish_drag(window: HWND) {
    if !ACTIVE_DRAG.get().is_some_and(|drag| drag.window == window) {
        return;
    }
    // ReleaseCapture 会同步发送 WM_CAPTURECHANGED，先清除状态并卸载回调。
    ACTIVE_DRAG.set(None);
    unsafe {
        RemoveWindowSubclass(window, Some(drag_message), DRAG_SUBCLASS);
        if GetCapture() == window {
            ReleaseCapture();
        }
    }
}

unsafe extern "system" fn drag_message(
    window: HWND,
    message: u32,
    w: usize,
    l: isize,
    _id: usize,
    _reference: usize,
) -> isize {
    if let Some(drag) = ACTIVE_DRAG.get().filter(|drag| drag.window == window) {
        match message {
            WM_MOUSEMOVE if primary_button_down() => {
                let mut cursor = POINT { x: 0, y: 0 };
                let moved = unsafe {
                    GetCursorPos(&mut cursor) != 0
                        && SetWindowPos(
                            window,
                            std::ptr::null_mut(),
                            cursor.x + drag.offset.x,
                            cursor.y + drag.offset.y,
                            0,
                            0,
                            SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOZORDER,
                        ) != 0
                };
                if moved {
                    return 0;
                }
                finish_drag(window);
            }
            WM_MOUSEMOVE | WM_LBUTTONUP | WM_CANCELMODE | WM_CAPTURECHANGED | WM_NCDESTROY => {
                finish_drag(window);
            }
            WM_RBUTTONUP if !primary_button_down() => finish_drag(window),
            WM_ACTIVATE if w as u16 == WA_INACTIVE as u16 => finish_drag(window),
            WM_SHOWWINDOW if w == 0 => finish_drag(window),
            _ => {}
        }
    }
    unsafe { DefSubclassProc(window, message, w, l) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows_sys::Win32::UI::{
        Input::KeyboardAndMouse::GetFocus,
        WindowsAndMessaging::{
            CreateWindowExW, DestroyWindow, GetForegroundWindow, SendMessageW, WS_POPUP,
        },
    };

    #[test]
    fn drag_stops_on_mouse_release_without_losing_focus() {
        let class = "STATIC\0".encode_utf16().collect::<Vec<_>>();
        let window = unsafe {
            CreateWindowExW(
                0,
                class.as_ptr(),
                std::ptr::null(),
                WS_POPUP,
                -32000,
                -32000,
                4,
                4,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null(),
            )
        };
        assert!(!window.is_null());
        let (foreground, focus) = unsafe { (GetForegroundWindow(), GetFocus()) };
        // 走 start_dragging 的同一路径：子类化并捕获鼠标，但不能激活窗口。
        let result = begin_drag(window);
        let captured = unsafe { GetCapture() } == window;
        let kept_focus = unsafe { GetForegroundWindow() == foreground && GetFocus() == focus };
        if result.is_ok() {
            unsafe { SendMessageW(window, WM_LBUTTONUP, 0, 0) };
        }
        let stopped = ACTIVE_DRAG.get().is_none() && unsafe { GetCapture() }.is_null();
        let kept_focus =
            kept_focus && unsafe { GetForegroundWindow() == foreground && GetFocus() == focus };
        unsafe { DestroyWindow(window) };
        result.unwrap();
        assert!(captured);
        assert!(kept_focus);
        assert!(stopped);
    }
}
