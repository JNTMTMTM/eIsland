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

//! 用临时 Win32 窗口验证真实边界和窗口状态，不操作用户窗口。

use super::*;
use windows_sys::Win32::{
    Foundation::POINT, Graphics::Gdi::MonitorFromPoint, UI::WindowsAndMessaging::*,
};

struct TestWindow(HWND);
impl Drop for TestWindow {
    fn drop(&mut self) {
        unsafe { DestroyWindow(self.0) };
    }
}

#[test]
fn detects_untitled_fullscreen_and_filters_non_application_windows() {
    unsafe {
        let monitor = MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        assert_ne!(GetMonitorInfoW(monitor, &mut info), 0);
        let rect = info.rcMonitor;
        let window = TestWindow(CreateWindowExW(
            WS_EX_NOACTIVATE,
            windows_sys::w!("STATIC"),
            windows_sys::w!(""),
            WS_POPUP,
            rect.left,
            rect.top,
            rect.right - rect.left,
            rect.bottom - rect.top,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null(),
        ));
        assert!(!window.0.is_null());
        assert!(!is_fullscreen(window.0, 0), "hidden window");
        ShowWindow(window.0, SW_SHOWNOACTIVATE);
        assert!(is_fullscreen(window.0, 0), "untitled borderless fullscreen");
        // 不排除本进程时，真实枚举必须找到测试窗口。
        assert_eq!(
            any_except(0),
            Ok(true),
            "enumeration finds fullscreen window"
        );
        assert!(!is_fullscreen(window.0, std::process::id()), "own process");
        SetWindowLongPtrW(
            window.0,
            GWL_STYLE,
            (WS_POPUP | WS_VISIBLE | WS_DISABLED) as isize,
        );
        assert!(!is_fullscreen(window.0, 0), "disabled window");
        SetWindowLongPtrW(window.0, GWL_STYLE, (WS_POPUP | WS_VISIBLE) as isize);
        SetWindowLongPtrW(
            window.0,
            GWL_EXSTYLE,
            (WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW) as isize,
        );
        assert!(!is_fullscreen(window.0, 0), "tool window");
        SetWindowLongPtrW(window.0, GWL_EXSTYLE, WS_EX_NOACTIVATE as isize);
        ShowWindow(window.0, SW_SHOWMINNOACTIVE);
        assert!(!is_fullscreen(window.0, 0), "minimized window");
        ShowWindow(window.0, SW_SHOWNOACTIVATE);
        SetWindowPos(
            window.0,
            std::ptr::null_mut(),
            rect.left,
            rect.top,
            rect.right - rect.left,
            rect.bottom - rect.top - 80,
            SWP_NOACTIVATE | SWP_NOZORDER,
        );
        assert!(!is_fullscreen(window.0, 0), "work-area-sized window");
        assert!(!is_fullscreen(GetDesktopWindow(), 0));
        assert!(!is_fullscreen(GetShellWindow(), 0));
        assert!(any().is_ok(), "real desktop enumeration");
    }
}
