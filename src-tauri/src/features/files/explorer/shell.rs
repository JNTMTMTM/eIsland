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

//! 使用 Windows Shell 处理跨卷传输、命名冲突和回收站语义。
use super::{absolute, child_name};
use crate::shared::Result;
use serde_json::Value;
use std::path::Path;
use windows::{
    core::{HSTRING, PCWSTR},
    Win32::{
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
            COINIT_APARTMENTTHREADED,
        },
        UI::Shell::{
            FileOperation, IFileOperation, IShellItem, SHCreateItemFromParsingName,
            FOFX_EARLYFAILURE, FOFX_RECYCLEONDELETE, FOF_ALLOWUNDO, FOF_NOERRORUI,
            FOF_RENAMEONCOLLISION, FOF_WANTNUKEWARNING,
        },
    },
};

struct Apartment;
impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

fn item(path: &Path) -> windows::core::Result<IShellItem> {
    unsafe { SHCreateItemFromParsingName(&HSTRING::from(path.as_os_str()), None) }
}

pub(super) fn operate(channel: &str, source: &Path, argument: &Value) -> Result<()> {
    std::fs::symlink_metadata(source).map_err(|e| e.to_string())?;
    if channel == "explorer:rename" {
        // MoveFileW 原子拒绝重名目标，也支持仅更改文件名的大小写。
        let destination = source.with_file_name(child_name(argument)?);
        if source == destination {
            return Ok(());
        }
        let old = HSTRING::from(source.as_os_str());
        let new = HSTRING::from(destination.as_os_str());
        if unsafe { windows_sys::Win32::Storage::FileSystem::MoveFileW(old.as_ptr(), new.as_ptr()) }
            == 0
        {
            return Err(std::io::Error::last_os_error().to_string());
        }
        return Ok(());
    }
    let destination = match channel {
        "explorer:copy" | "explorer:move" => {
            let dest = absolute(argument)?;
            if !dest.is_dir() {
                return Err("invalidPath".into());
            }
            let resolved = dest.canonicalize().map_err(|e| e.to_string())?;
            if source.is_dir()
                && resolved.starts_with(source.canonicalize().map_err(|e| e.to_string())?)
            {
                return Err("insideSource".into());
            }
            if channel == "explorer:move"
                && source.parent().and_then(|p| p.canonicalize().ok()).as_ref() == Some(&resolved)
            {
                return Ok(());
            }
            Some(dest)
        }
        _ => None,
    };
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let _apartment = Apartment;
        let perform = || -> windows::core::Result<bool> {
            let operation: IFileOperation =
                CoCreateInstance(&FileOperation, None, CLSCTX_INPROC_SERVER)?;
            let mut flags = FOF_ALLOWUNDO | FOF_NOERRORUI | FOFX_EARLYFAILURE;
            if channel == "explorer:trash" {
                flags |= FOFX_RECYCLEONDELETE | FOF_WANTNUKEWARNING;
            }
            if destination.is_some() {
                flags |= FOF_RENAMEONCOLLISION;
            }
            operation.SetOperationFlags(flags)?;
            let source = item(source)?;
            if let Some(dest) = destination {
                let folder = item(&dest)?;
                if channel == "explorer:copy" {
                    operation.CopyItem(&source, &folder, PCWSTR::null(), None)?;
                } else {
                    operation.MoveItem(&source, &folder, PCWSTR::null(), None)?;
                }
            } else {
                operation.DeleteItem(&source, None)?;
            }
            operation.PerformOperations()?;
            Ok(!operation.GetAnyOperationsAborted()?.as_bool())
        };
        if !perform().map_err(|e| e.to_string())? {
            return Err("cancelled".into());
        }
    }
    Ok(())
}
