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

use crate::shared::Result;
use serde_json::Value;
use std::{
    ffi::{c_char, c_void, CStr, CString},
    mem::ManuallyDrop,
    path::Path,
};
type Integer = unsafe extern "system" fn() -> i32;
type Json = unsafe extern "system" fn() -> *mut c_char;

pub struct Api {
    // Native AOT libraries must remain loaded for the lifetime of their runtime threads.
    _library: ManuallyDrop<libloading::Library>,
    start: Integer,
    stop: Integer,
    wait: unsafe extern "system" fn(i32) -> i32,
    all: Json,
    drain: Json,
    free: unsafe extern "system" fn(*mut c_void),
    source: unsafe extern "system" fn(*const c_char),
    play: Integer,
    pause: Integer,
    next: Integer,
    previous: Integer,
    seek: unsafe extern "system" fn(f64) -> i32,
    error: Json,
}
impl Api {
    pub fn load(path: &Path) -> Result<Self> {
        // Only load the architecture-specific application resource, never a PATH lookup.
        unsafe {
            let library =
                ManuallyDrop::new(libloading::Library::new(path).map_err(|e| e.to_string())?);
            macro_rules! symbol {
                ($name:literal) => {
                    *library
                        .get(concat!($name, "\0").as_bytes())
                        .map_err(|e| e.to_string())?
                };
            }
            Ok(Self {
                start: symbol!("smtc_start_monitoring"),
                stop: symbol!("smtc_stop_monitoring"),
                wait: symbol!("smtc_wait_for_changes"),
                all: symbol!("smtc_get_all_sessions"),
                drain: symbol!("smtc_drain_session_changes"),
                free: symbol!("smtc_free_string"),
                source: symbol!("smtc_set_command_source"),
                play: symbol!("smtc_play"),
                pause: symbol!("smtc_pause"),
                next: symbol!("smtc_next"),
                previous: symbol!("smtc_previous"),
                seek: symbol!("smtc_seek"),
                error: symbol!("smtc_get_last_error"),
                _library: library,
            })
        }
    }
    fn string(&self, function: Json) -> Result<Option<String>> {
        unsafe {
            let pointer = function();
            if pointer.is_null() {
                return Ok(None);
            }
            let value = CStr::from_ptr(pointer)
                .to_str()
                .map(str::to_owned)
                .map_err(|e| e.to_string());
            (self.free)(pointer.cast());
            value.map(Some)
        }
    }
    pub fn start(&self) -> Result<()> {
        if unsafe { (self.start)() } == 0 {
            Ok(())
        } else {
            Err("SMTC monitor failed to start".into())
        }
    }
    pub fn stop(&self) {
        unsafe {
            (self.stop)();
        }
    }
    pub fn wait(&self) -> i32 {
        unsafe { (self.wait)(250) }
    }
    pub fn snapshot(&self, full: bool) -> Result<Vec<Value>> {
        let value = self.string(if full { self.all } else { self.drain })?;
        match value {
            Some(s) => serde_json::from_str(&s).map_err(|e| e.to_string()),
            None if !full => Ok(Vec::new()),
            None => Err("SMTC snapshot unavailable".into()),
        }
    }
    /// Caller serializes source selection and invocation as a single operation.
    pub fn command(&self, source: &str, name: &str, value: Option<f64>) -> Result<()> {
        let source = CString::new(source).map_err(|e| e.to_string())?;
        let code = unsafe {
            (self.source)(source.as_ptr());
            match name {
                "play" => (self.play)(),
                "pause" => (self.pause)(),
                "next" => (self.next)(),
                "previous" => (self.previous)(),
                "seek" => (self.seek)(value.ok_or("Missing seek position")?),
                _ => return Err("Unknown media command".into()),
            }
        };
        if code == 0 {
            Ok(())
        } else {
            Err(self
                .string(self.error)?
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| format!("SMTC {name} failed")))
        }
    }
}
