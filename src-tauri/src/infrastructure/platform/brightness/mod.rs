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

//! Brightness control runs in a blocking worker and accesses system display APIs.

#[cfg(any(target_os = "macos", test))]
mod ddc;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

#[cfg(windows)]
use self::windows as native;
#[cfg(target_os = "macos")]
use macos as native;

#[cfg(any(windows, target_os = "macos"))]
pub(crate) use native::{get, set};

#[cfg(not(any(windows, target_os = "macos")))]
pub(crate) fn get() -> Option<u8> {
    None
}

#[cfg(not(any(windows, target_os = "macos")))]
pub(crate) fn set(_percent: u8) -> bool {
    false
}
