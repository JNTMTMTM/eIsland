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

//! 复用截图插件的 Native AOT 二进制接口，不加载 Node 或 FFI 桥接脚本。

use crate::shared::Result;
use std::{
    ffi::{c_char, c_void, CStr},
    mem::ManuallyDrop,
    path::Path,
    sync::{Mutex, OnceLock},
};

type Capture = unsafe extern "system" fn(*mut i32) -> *mut c_void;
type Free = unsafe extern "system" fn(*mut c_void);

struct Api {
    // Native AOT 的运行时线程可能持续存在，DLL 必须保留到宿主退出。
    _library: ManuallyDrop<libloading::Library>,
    primary: Capture,
    all: Capture,
    error: unsafe extern "system" fn() -> *mut c_char,
    free: Free,
}

impl Api {
    fn load(path: &Path) -> Result<Self> {
        // 路径由原生资源服务解析，不接受设置中的任意 DLL 路径或 PATH 查找。
        unsafe {
            let library =
                ManuallyDrop::new(libloading::Library::new(path).map_err(|e| e.to_string())?);
            Ok(Self {
                primary: *library
                    .get(b"sc_capture_primary_display_png_bytes\0")
                    .map_err(|e| e.to_string())?,
                all: *library
                    .get(b"sc_capture_all_displays_png_bytes\0")
                    .map_err(|e| e.to_string())?,
                error: *library
                    .get(b"sc_get_last_error\0")
                    .map_err(|e| e.to_string())?,
                free: *library
                    .get(b"sc_free_string\0")
                    .map_err(|e| e.to_string())?,
                _library: library,
            })
        }
    }

    fn capture(&self, all: bool) -> Result<Vec<u8>> {
        let mut length = 0i32;
        let pointer = unsafe { (if all { self.all } else { self.primary })(&mut length) };
        if pointer.is_null() {
            let error = unsafe { (self.error)() };
            if error.is_null() {
                return Err("Screenshot plugin failed".into());
            }
            let allocation = Allocation {
                pointer: error.cast(),
                free: self.free,
            };
            let message = unsafe { CStr::from_ptr(allocation.pointer.cast()) }.to_string_lossy();
            return Err(if message.is_empty() {
                "Screenshot plugin failed".into()
            } else {
                message.into_owned()
            });
        }
        let allocation = Allocation {
            pointer,
            free: self.free,
        };
        if !(1..=64 * 1024 * 1024).contains(&length) {
            return Err("Screenshot plugin returned an invalid PNG size".into());
        }
        // 已验证原生长度，在 DLL 分配仍有效时复制；所有退出路径均由原分配器释放。
        Ok(
            unsafe { std::slice::from_raw_parts(allocation.pointer.cast(), length as usize) }
                .to_vec(),
        )
    }
}

struct Allocation {
    pointer: *mut c_void,
    free: Free,
}
impl Drop for Allocation {
    fn drop(&mut self) {
        unsafe { (self.free)(self.pointer) };
    }
}

/// 串行调用插件，避免其共享错误状态交叉；加载失败不会永久缓存为不可用。
pub(crate) fn capture(path: &Path, all: bool) -> Result<Vec<u8>> {
    static API: OnceLock<Mutex<Option<Api>>> = OnceLock::new();
    let mut api = API
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|e| e.to_string())?;
    if api.is_none() {
        *api = Some(Api::load(path)?);
    }
    api.as_ref()
        .ok_or("Screenshot plugin unavailable")?
        .capture(all)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_library_returns_error_without_a_node_dependency() {
        let path =
            std::env::temp_dir().join(format!("missing-screenshot-{}.dll", uuid::Uuid::new_v4()));
        assert!(capture(&path, false).is_err());
        assert!(capture(&path, true).is_err());
    }
}
