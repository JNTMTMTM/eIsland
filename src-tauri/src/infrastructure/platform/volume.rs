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

//! System volume and mute on the current default playback device.

use crate::shared::Result;
use serde_json::{json, Value};

pub(crate) enum Operation {
    Get,
    Set(u8),
    GetMute,
    ToggleMute,
}

pub(crate) async fn run(operation: Operation) -> Result<Value> {
    tauri::async_runtime::spawn_blocking(move || execute(operation))
        .await
        .map_err(|error| error.to_string())
}

#[cfg(any(windows, target_os = "macos"))]
fn execute(operation: Operation) -> Value {
    match operation {
        Operation::Get => json!(native::level().and_then(percent)),
        Operation::Set(value) => json!(native::set_level(f32::from(value) / 100.)),
        Operation::GetMute => json!(native::mute(false)),
        Operation::ToggleMute => json!(native::mute(true)),
    }
}

#[cfg(not(any(windows, target_os = "macos")))]
fn execute(operation: Operation) -> Value {
    match operation {
        Operation::Set(value) => {
            let _ = value;
            json!(false)
        }
        _ => Value::Null,
    }
}

#[cfg(any(windows, target_os = "macos"))]
fn percent(scalar: f32) -> Option<u8> {
    scalar
        .is_finite()
        .then(|| (scalar.clamp(0., 1.) * 100.).round_ties_even() as u8)
}

#[cfg(windows)]
mod native {
    use windows::{
        core::GUID,
        Win32::{
            Foundation::RPC_E_CHANGED_MODE,
            Media::Audio::{
                eMultimedia, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
                MMDeviceEnumerator,
            },
            System::Com::{
                CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
            },
        },
    };

    struct Apartment(bool);

    impl Drop for Apartment {
        fn drop(&mut self) {
            if self.0 {
                unsafe { CoUninitialize() };
            }
        }
    }

    fn output<T>(
        action: impl FnOnce(IAudioEndpointVolume) -> windows::core::Result<T>,
    ) -> Option<T> {
        // The blocking worker may already have a caller-owned COM apartment.
        let status = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let _apartment = Apartment(status.is_ok());
        if status.is_err() && status != RPC_E_CHANGED_MODE {
            return None;
        }
        unsafe {
            let devices: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
            let device = devices.GetDefaultAudioEndpoint(eRender, eMultimedia).ok()?;
            action(device.Activate(CLSCTX_ALL, None).ok()?).ok()
        }
    }

    pub(super) fn level() -> Option<f32> {
        output(|device| unsafe { device.GetMasterVolumeLevelScalar() })
    }

    pub(super) fn set_level(value: f32) -> bool {
        output(|device| unsafe { device.SetMasterVolumeLevelScalar(value, &GUID::zeroed()) })
            .is_some()
    }

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

#[cfg(target_os = "macos")]
mod native {
    use objc2_core_audio::{
        kAudioDevicePropertyMute, kAudioDevicePropertyVolumeScalar,
        kAudioHardwarePropertyDefaultOutputDevice, kAudioObjectPropertyElementMain,
        kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyScopeOutput, kAudioObjectSystemObject,
        kAudioObjectUnknown, AudioObjectGetPropertyData, AudioObjectID, AudioObjectPropertyAddress,
        AudioObjectSetPropertyData,
    };
    use std::{
        mem::size_of,
        ptr::{null, NonNull},
    };

    // AudioHardwareService's virtual main volume covers devices with only channel controls.
    const VOLUME_SELECTORS: [u32; 2] = [
        kAudioDevicePropertyVolumeScalar,
        u32::from_be_bytes(*b"vmvc"),
    ];

    fn address(selector: u32, scope: u32) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: scope,
            mElement: kAudioObjectPropertyElementMain,
        }
    }

    fn read<T: Default>(id: AudioObjectID, property: AudioObjectPropertyAddress) -> Option<T> {
        let mut value = T::default();
        let mut size = size_of::<T>() as u32;
        // Callers pair each selector with its HAL scalar type (u32 or f32).
        let status = unsafe {
            AudioObjectGetPropertyData(
                id,
                NonNull::from(&property),
                0,
                null(),
                NonNull::from(&mut size),
                NonNull::from(&mut value).cast(),
            )
        };
        (status == 0 && size == size_of::<T>() as u32).then_some(value)
    }

    fn write<T>(id: AudioObjectID, property: AudioObjectPropertyAddress, value: T) -> bool {
        // The property and scalar are borrowed for the duration of the HAL call.
        let status = unsafe {
            AudioObjectSetPropertyData(
                id,
                NonNull::from(&property),
                0,
                null(),
                size_of::<T>() as u32,
                NonNull::from(&value).cast(),
            )
        };
        status == 0
    }

    fn output() -> Option<AudioObjectID> {
        read(
            kAudioObjectSystemObject as AudioObjectID,
            address(
                kAudioHardwarePropertyDefaultOutputDevice,
                kAudioObjectPropertyScopeGlobal,
            ),
        )
        .filter(|id| *id != kAudioObjectUnknown)
    }

    pub(super) fn level() -> Option<f32> {
        let id = output()?;
        VOLUME_SELECTORS
            .into_iter()
            .find_map(|selector| read(id, address(selector, kAudioObjectPropertyScopeOutput)))
    }

    pub(super) fn set_level(value: f32) -> bool {
        output().is_some_and(|id| {
            VOLUME_SELECTORS.into_iter().any(|selector| {
                write(
                    id,
                    address(selector, kAudioObjectPropertyScopeOutput),
                    value,
                )
            })
        })
    }

    pub(super) fn mute(toggle: bool) -> Option<bool> {
        let id = output()?;
        let property = address(kAudioDevicePropertyMute, kAudioObjectPropertyScopeOutput);
        let muted = read::<u32>(id, property)? != 0;
        if toggle && !write(id, property, u32::from(!muted)) {
            return None;
        }
        Some(muted ^ toggle)
    }
}

#[cfg(all(test, any(windows, target_os = "macos")))]
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
