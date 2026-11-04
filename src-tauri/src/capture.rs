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

use crate::{
    state::Desktop,
    windows::{self, Result},
};
use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, RgbaImage};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

/// Capture the primary display through the native backend without opening a WebView.
pub async fn primary() -> Result<Value> {
    static BUSY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if BUSY.swap(true, std::sync::atomic::Ordering::AcqRel) {
        return Ok(Value::Null);
    }
    let result = tauri::async_runtime::spawn_blocking(|| {
        let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
        let monitor = monitors
            .iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .or_else(|| monitors.first())
            .ok_or("No monitors available")?;
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        let mut bytes = std::io::Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(image)
            .write_to(&mut bytes, image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        Ok(json!(format!(
            "data:image/png;base64,{}",
            STANDARD.encode(bytes.into_inner())
        )))
    })
    .await
    .map_err(|e| e.to_string())
    .and_then(|value| value);
    BUSY.store(false, std::sync::atomic::Ordering::Release);
    result
}

/// Capture every monitor before showing the overlay; bitmap coordinates are physical pixels.
pub async fn start(app: &AppHandle) -> Result<()> {
    if app.get_webview_window("capture").is_some() {
        return Ok(());
    }
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if s.capture_starting {
            return Ok(());
        }
        s.capture_starting = true;
    }
    let result = capture_hidden_desktop(app).await;
    app.state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .capture_starting = false;
    if let Err(error) = result {
        windows::restore_after_capture(app)?;
        return Err(error);
    }
    Ok(())
}

async fn capture_hidden_desktop(app: &AppHandle) -> Result<()> {
    windows::main_window(app)?
        .hide()
        .map_err(|e| e.to_string())?;
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
    capture_desktop(app)
}

fn capture_desktop(app: &AppHandle) -> Result<()> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("No monitors available".into());
    }
    let mut shots = Vec::new();
    for monitor in monitors {
        let x = monitor.x().map_err(|e| e.to_string())?;
        let y = monitor.y().map_err(|e| e.to_string())?;
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        shots.push((x, y, image));
    }
    let x = shots.iter().map(|(x, _, _)| *x).min().unwrap();
    let y = shots.iter().map(|(_, y, _)| *y).min().unwrap();
    let right = shots
        .iter()
        .map(|(x, _, i)| *x as i64 + i.width() as i64)
        .max()
        .unwrap();
    let bottom = shots
        .iter()
        .map(|(_, y, i)| *y as i64 + i.height() as i64)
        .max()
        .unwrap();
    let width = (right - x as i64) as u32;
    let height = (bottom - y as i64) as u32;
    if width as u64 * height as u64 > 160_000_000 {
        return Err("Virtual desktop exceeds capture limit".into());
    }
    let mut canvas = RgbaImage::new(width, height);
    for (sx, sy, image) in shots {
        image::imageops::overlay(&mut canvas, &image, (sx - x) as i64, (sy - y) as i64);
    }
    let mut bytes = std::io::Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(canvas)
        .write_to(&mut bytes, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let visible_windows = xcap::Window::all().map_err(|e|e.to_string())?.iter().filter_map(|window| {
        if window.pid().ok()? == std::process::id() || window.is_minimized().ok()? { return None; }
        Some(json!({"x":window.x().ok()?,"y":window.y().ok()?,"width":window.width().ok()?,"height":window.height().ok()?,"title":window.title().ok()?}))
    }).collect::<Vec<_>>();
    let physical = json!({"x":x,"y":y,"width":width,"height":height});
    let payload = json!({
        "imageDataURL":format!("data:image/png;base64,{}", STANDARD.encode(bytes.into_inner())),
        "virtualScreen":physical, "physicalScreen":physical,
        "displays":[], "scaleFactor":1, "captureSource":"js", "visibleWindows":visible_windows
    });
    app.state::<Desktop>().inner.lock().unwrap().capture_payload = Some(payload);
    let window = windows::create(app, "capture")?;
    // Device-pixel canvas keeps selection coordinates identical to the captured bitmap.
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window
        .set_zoom(1. / window.scale_factor().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn ready(app: &AppHandle) -> Result<()> {
    let payload = app
        .state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .capture_payload
        .clone();
    if let (Some(payload), Some(window)) = (payload, app.get_webview_window("capture")) {
        windows::emit(app, "capture", "capture-image", json!([payload]))?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn close(app: &AppHandle) -> Result<()> {
    if let Some(window) = app.get_webview_window("capture") {
        window.destroy().map_err(|e| e.to_string())?;
    }
    windows::restore_after_capture(app)
}
pub fn image_bytes(payload: &Value) -> Result<Vec<u8>> {
    let data = payload
        .get("dataURL")
        .and_then(Value::as_str)
        .ok_or("Missing screenshot")?;
    let encoded = data
        .strip_prefix("data:image/png;base64,")
        .ok_or("Expected a PNG data URL")?;
    if encoded.len() > 100_000_000 {
        return Err("Screenshot too large".into());
    }
    STANDARD.decode(encoded).map_err(|e| e.to_string())
}
pub fn copy(payload: &Value) -> Result<()> {
    let image = image::load_from_memory(&image_bytes(payload)?)
        .map_err(|e| e.to_string())?
        .into_rgba8();
    arboard::Clipboard::new()
        .map_err(|e| e.to_string())?
        .set_image(arboard::ImageData {
            width: image.width() as usize,
            height: image.height() as usize,
            bytes: std::borrow::Cow::Owned(image.into_raw()),
        })
        .map_err(|e| e.to_string())
}

pub fn save(payload: &Value) -> Result<()> {
    let bytes = image_bytes(payload)?;
    if let Some(path) = rfd::FileDialog::new()
        .add_filter("PNG", &["png"])
        .set_file_name("eIsland.png")
        .save_file()
    {
        std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    }
    Ok(())
}
