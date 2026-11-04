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

use crate::windows::Result;

/// Bind managed native helper children to the application lifetime.
/// User-launched applications and shell tools remain outside this job.
pub fn contain(pid: u32) -> Result<()> {
    #[cfg(windows)]
    {
        use std::sync::OnceLock;
        use windows_sys::Win32::{
            Foundation::CloseHandle,
            System::{
                JobObjects::*,
                Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE},
            },
        };
        static JOB: OnceLock<Result<usize>> = OnceLock::new();
        let job = JOB
            .get_or_init(|| {
                let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
                if handle.is_null() {
                    return Err(std::io::Error::last_os_error().to_string());
                }
                let mut limits =
                    unsafe { std::mem::zeroed::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() };
                limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                if unsafe {
                    SetInformationJobObject(
                        handle,
                        JobObjectExtendedLimitInformation,
                        (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                        std::mem::size_of_val(&limits) as u32,
                    )
                } == 0
                {
                    let error = std::io::Error::last_os_error().to_string();
                    unsafe {
                        CloseHandle(handle);
                    }
                    return Err(error);
                }
                // Retain a non-inheritable handle until process exit, including forced exits.
                Ok(handle as usize)
            })
            .as_ref()
            .map_err(Clone::clone)?;
        let process = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
        if process.is_null() {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let assigned = unsafe { AssignProcessToJobObject(*job as _, process) };
        let error = std::io::Error::last_os_error();
        unsafe {
            CloseHandle(process);
        }
        if assigned == 0 {
            return Err(error.to_string());
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        Ok(())
    }
}
