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

//! Shell icon extraction on fresh, STA and MTA workers with balanced COM ownership.

use super::file_icon;
use base64::Engine;
use std::path::{Path, PathBuf};
use windows::Win32::{
    Foundation::CO_E_NOTINITIALIZED,
    System::Com::{
        CoGetApartmentType, CoInitializeEx, CoUninitialize, APTTYPE, APTTYPEQUALIFIER_NONE,
        APTTYPE_CURRENT, COINIT_APARTMENTTHREADED, COINIT_MULTITHREADED,
    },
};

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let directory =
            std::env::temp_dir().join(format!("eisland-icon-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        image::RgbaImage::from_pixel(32, 32, image::Rgba([255, 0, 0, 255]))
            .save_with_format(directory.join("图标😀.ico"), image::ImageFormat::Ico)
            .unwrap();
        Self(directory)
    }
    fn icon(&self) -> PathBuf {
        self.0.join("图标😀.ico")
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(self.icon());
        let _ = std::fs::remove_dir(&self.0);
    }
}

fn apartment() -> windows::core::Result<APTTYPE> {
    let mut kind = APTTYPE_CURRENT;
    let mut qualifier = APTTYPEQUALIFIER_NONE;
    unsafe { CoGetApartmentType(&mut kind, &mut qualifier)? };
    Ok(kind)
}

fn assert_png(path: &Path) {
    let value = file_icon(path).unwrap();
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(value.as_str().expect("Existing ICO must produce a PNG"))
        .unwrap();
    let image = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .unwrap()
        .to_rgba8();
    assert_eq!(image.dimensions(), (32, 32));
    assert!(image.pixels().any(|pixel| pixel[3] > 0));
}

#[test]
fn fresh_worker_extracts_unicode_icon_and_releases_com_on_success_and_missing_file() {
    let fixture = Fixture::new();
    let path = fixture.icon();
    std::thread::spawn(move || {
        assert_eq!(apartment().unwrap_err().code(), CO_E_NOTINITIALIZED);
        assert_png(&path);
        assert_eq!(apartment().unwrap_err().code(), CO_E_NOTINITIALIZED);
        assert!(file_icon(&path.with_file_name("missing.exe"))
            .unwrap()
            .is_null());
        assert_eq!(apartment().unwrap_err().code(), CO_E_NOTINITIALIZED);
    })
    .join()
    .unwrap();
}

#[test]
fn icon_extraction_preserves_caller_owned_sta_and_mta_apartments() {
    let fixture = Fixture::new();
    for mode in [COINIT_APARTMENTTHREADED, COINIT_MULTITHREADED] {
        let path = fixture.icon();
        std::thread::spawn(move || {
            unsafe { CoInitializeEx(None, mode) }.ok().unwrap();
            let before = apartment().unwrap();
            assert_png(&path);
            assert_eq!(apartment().unwrap(), before);
            assert!(file_icon(&path.with_file_name("missing.exe"))
                .unwrap()
                .is_null());
            assert_eq!(apartment().unwrap(), before);
            unsafe { CoUninitialize() };
            assert_eq!(apartment().unwrap_err().code(), CO_E_NOTINITIALIZED);
        })
        .join()
        .unwrap();
    }
}
