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

//! 屏幕亮度控制，需在阻塞线程中调用系统显示器接口。

#[cfg(windows)]
mod windows;

#[cfg(windows)]
pub(crate) use self::windows::{get, set};

/// 读取当前亮度；不支持的平台始终返回 `None`。
#[cfg(not(windows))]
pub(crate) fn get() -> Option<u8> {
    None
}

/// 写入亮度；不支持的平台始终返回 `false`。
#[cfg(not(windows))]
pub(crate) fn set(_percent: u8) -> bool {
    false
}
