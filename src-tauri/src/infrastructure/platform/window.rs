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

/// 先约束原生层级，再由 Tauri 显示，保持框架的可见性状态与 HWND 一致。
#[cfg(windows)]
pub fn show_below(window: &WebviewWindow, above: &WebviewWindow) -> Result<(), String> {
    let handle = window.hwnd().map_err(|e| e.to_string())?.0 as usize;
    let above = above.hwnd().map_err(|e| e.to_string())?.0 as usize;
    let effect = window.clone();
    let (send, receive) = std::sync::mpsc::sync_channel(1);
    // 子类化必须在 HWND 所在线程执行；Tauri 在主线程调用时直接执行此回调。
    window
        .run_on_main_thread(move || {
            let result = keep_below_handles(handle as _, above as _)
                .and_then(|()| effect.show().map_err(|error| error.to_string()));
            let _ = send.send(result);
        })
        .map_err(|error| error.to_string())?;
    receive.recv().map_err(|error| error.to_string())?
}

#[cfg(windows)]
fn keep_below_handles(
    window: windows_sys::Win32::Foundation::HWND,
    above: windows_sys::Win32::Foundation::HWND,
) -> Result<(), String> {
    use windows_sys::Win32::UI::Shell::SetWindowSubclass;
    if unsafe { SetWindowSubclass(window, Some(effect_order), 1, above as usize) } == 0 {
        return Err("Failed to configure effect window stacking".into());
    }
    Ok(())
}

/// 在显示/置顶请求生效之前约束插入位置；不等待可见后的第二次重排。
#[cfg(windows)]
unsafe extern "system" fn effect_order(
    window: windows_sys::Win32::Foundation::HWND,
    message: u32,
    w: usize,
    l: isize,
    id: usize,
    reference: usize,
) -> isize {
    use windows_sys::Win32::UI::{
        Shell::{DefSubclassProc, RemoveWindowSubclass},
        WindowsAndMessaging::{
            IsWindow, SWP_NOACTIVATE, SWP_NOZORDER, WINDOWPOS, WM_NCDESTROY, WM_WINDOWPOSCHANGING,
        },
    };
    if message == WM_WINDOWPOSCHANGING && l != 0 && unsafe { IsWindow(reference as _) } != 0 {
        let position = unsafe { &mut *(l as *mut WINDOWPOS) };
        position.hwndInsertAfter = reference as _;
        position.flags = (position.flags & !SWP_NOZORDER) | SWP_NOACTIVATE;
    }
    if message == WM_NCDESTROY {
        unsafe { RemoveWindowSubclass(window, Some(effect_order), id) };
    }
    unsafe { DefSubclassProc(window, message, w, l) }
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

#[cfg(all(test, windows))]
mod effect_layer_tests {
    use super::keep_below_handles;
    use std::cell::{Cell, RefCell};
    use windows_sys::Win32::{Foundation::HWND, UI::WindowsAndMessaging::*};

    thread_local! {
        static OBSERVED: RefCell<(HWND, Vec<bool>)> = const { RefCell::new((std::ptr::null_mut(), Vec::new())) };
        static ORIGINAL: Cell<WNDPROC> = const { Cell::new(None) };
    }

    unsafe extern "system" fn observe_show(
        window: HWND,
        message: u32,
        w: usize,
        l: isize,
    ) -> isize {
        if message == WM_WINDOWPOSCHANGED && unsafe { IsWindowVisible(window) } != 0 {
            OBSERVED.with(|state| {
                let mut state = state.borrow_mut();
                let mut previous = unsafe { GetWindow(window, GW_HWNDPREV) };
                while !previous.is_null() && previous != state.0 {
                    previous = unsafe { GetWindow(previous, GW_HWNDPREV) };
                }
                let below = previous == state.0;
                state.1.push(below);
            });
        }
        unsafe { CallWindowProcW(ORIGINAL.with(Cell::get), window, message, w, l) }
    }

    struct TestWindow(HWND);
    impl TestWindow {
        fn new(topmost: bool) -> Self {
            // 独立、无激活的屏幕外窗口；不复用用户窗口或改变前台焦点。
            let class = "STATIC\0".encode_utf16().collect::<Vec<_>>();
            let window = unsafe {
                CreateWindowExW(
                    WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | if topmost { WS_EX_TOPMOST } else { 0 },
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
            assert!(!window.is_null(), "{}", std::io::Error::last_os_error());
            Self(window)
        }
    }
    impl Drop for TestWindow {
        fn drop(&mut self) {
            unsafe { DestroyWindow(self.0) };
        }
    }

    #[test]
    fn first_visible_window_position_is_always_below_island_in_both_layers() {
        for topmost in [false, true] {
            let island = TestWindow::new(topmost);
            assert_ne!(
                unsafe {
                    SetWindowPos(
                        island.0,
                        if topmost { HWND_TOPMOST } else { HWND_TOP },
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
                    )
                },
                0
            );
            let effect = TestWindow::new(topmost);
            let original = unsafe {
                SetWindowLongPtrW(effect.0, GWLP_WNDPROC, observe_show as *const () as isize)
            };
            assert_ne!(original, 0);
            ORIGINAL.with(|value| {
                value.set(unsafe { std::mem::transmute::<isize, WNDPROC>(original) })
            });
            OBSERVED.with(|state| *state.borrow_mut() = (island.0, Vec::new()));
            assert_eq!(unsafe { IsWindowVisible(effect.0) }, 0);
            keep_below_handles(effect.0, island.0).unwrap();
            unsafe { ShowWindow(effect.0, SW_SHOWNOACTIVATE) };
            // 重复 ready 以及隐藏后的重开均不能把效果窗口抬到灵动岛上方。
            keep_below_handles(effect.0, island.0).unwrap();
            unsafe { ShowWindow(effect.0, SW_SHOWNOACTIVATE) };
            unsafe { ShowWindow(effect.0, SW_HIDE) };
            unsafe { ShowWindow(effect.0, SW_SHOWNOACTIVATE) };
            assert_ne!(unsafe { IsWindowVisible(effect.0) }, 0);
            OBSERVED.with(|state| {
                let state = state.borrow();
                assert!(
                    !state.1.is_empty(),
                    "No visible position change was observed"
                );
                assert!(
                    state.1.iter().all(|below| *below),
                    "Effect was visible above island: {:?}",
                    state.1
                );
            });
        }
    }
}
