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

//! 当前默认播放设备的系统音量与静音控制。

use crate::shared::Result;
use serde_json::{json, Value};

/// 音量操作类型，每次执行都会重新解析默认播放设备。
pub(crate) enum Operation {
    /// 读取主音量百分比
    Get,
    /// 设置主音量百分比（0~100）
    Set(u8),
    /// 读取静音状态
    GetMute,
    /// 切换静音状态
    ToggleMute,
}

/// 在阻塞线程中执行音量操作
/// @param operation - 要执行的音量操作
/// @returns `Get` 为音量百分比或 `null`；`Set` 为是否写入成功；
/// `GetMute`/`ToggleMute` 为（切换后的）静音状态或 `null`；阻塞任务失败时返回错误
pub(crate) async fn run(operation: Operation) -> Result<Value> {
    tauri::async_runtime::spawn_blocking(move || execute(operation))
        .await
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
fn execute(operation: Operation) -> Value {
    match operation {
        Operation::Get => json!(native::level().and_then(percent)),
        Operation::Set(value) => json!(native::set_level(f32::from(value) / 100.)),
        Operation::GetMute => json!(native::mute(false)),
        Operation::ToggleMute => json!(native::mute(true)),
    }
}

#[cfg(not(windows))]
fn execute(operation: Operation) -> Value {
    match operation {
        Operation::Set(value) => {
            let _ = value;
            json!(false)
        }
        _ => Value::Null,
    }
}

#[cfg(windows)]
fn percent(scalar: f32) -> Option<u8> {
    scalar
        .is_finite()
        .then(|| (scalar.clamp(0., 1.) * 100.).round_ties_even() as u8)
}

#[cfg(windows)]
mod native {
    use crate::infrastructure::platform::ComApartment;
    use windows::{
        core::GUID,
        Win32::{
            Media::Audio::{
                eMultimedia, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
                MMDeviceEnumerator,
            },
            System::Com::{CoCreateInstance, CLSCTX_ALL},
        },
    };

    fn output<T>(
        action: impl FnOnce(IAudioEndpointVolume) -> windows::core::Result<T>,
    ) -> Option<T> {
        let _apartment = ComApartment::enter()?;
        unsafe {
            let devices: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
            let device = devices.GetDefaultAudioEndpoint(eRender, eMultimedia).ok()?;
            action(device.Activate(CLSCTX_ALL, None).ok()?).ok()
        }
    }

    /// 读取主音量（0.0~1.0），设备不可用时为 `None`。
    pub(super) fn level() -> Option<f32> {
        output(|device| unsafe { device.GetMasterVolumeLevelScalar() })
    }

    /// 写入主音量（0.0~1.0），返回是否成功。
    pub(super) fn set_level(value: f32) -> bool {
        output(|device| unsafe { device.SetMasterVolumeLevelScalar(value, &GUID::zeroed()) })
            .is_some()
    }

    /// 读取静音状态，`toggle` 为 `true` 时先切换；返回最终状态，失败时为 `None`。
    pub(super) fn mute(toggle: bool) -> Option<bool> {
        output(|device| unsafe {
            let muted = device.GetMute()?.as_bool();
            if toggle {
                device.SetMute(!muted, &GUID::zeroed())?;
            }
            Ok(muted ^ toggle)
        })
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::percent;

    #[test]
    fn normalizes_native_levels_without_treating_invalid_data_as_silence() {
        assert_eq!(percent(-0.1), Some(0));
        assert_eq!(percent(0.125), Some(12));
        assert_eq!(percent(0.375), Some(38));
        assert_eq!(percent(1.1), Some(100));
        assert_eq!(percent(f32::NAN), None);
        assert_eq!(percent(f32::INFINITY), None);
    }
}
