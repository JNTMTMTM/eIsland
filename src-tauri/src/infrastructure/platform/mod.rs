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

//! 原生平台接口，编译平台边界在此声明。

pub(crate) mod brightness;
pub(crate) mod fullscreen;
#[cfg(windows)]
pub(crate) mod screenshot;
#[cfg(windows)]
pub(crate) mod smtc;
pub(crate) mod telemetry;
pub(crate) mod volume;
pub(crate) mod window;
#[cfg(windows)]
mod wmi;

/// 当前线程的 COM 多线程套间守卫，仅在本守卫完成初始化时于析构时反初始化。
#[cfg(windows)]
pub(super) struct ComApartment(bool);

#[cfg(windows)]
impl ComApartment {
    /// 进入 COM 多线程套间
    /// @returns 守卫；线程已处于其他套间时复用且不负责反初始化；初始化失败时为 `None`
    pub(super) fn enter() -> Option<Self> {
        use windows::Win32::{
            Foundation::RPC_E_CHANGED_MODE,
            System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
        };
        let status = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        // 阻塞线程可能已属于调用方持有的 STA，此时直接复用。
        (status.is_ok() || status == RPC_E_CHANGED_MODE).then_some(Self(status.is_ok()))
    }
}

#[cfg(windows)]
impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.0 {
            unsafe { windows::Win32::System::Com::CoUninitialize() };
        }
    }
}
