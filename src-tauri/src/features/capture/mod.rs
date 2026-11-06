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

pub(crate) mod tools;

use crate::features::windowing as windows;
use crate::shared::Result;
use crate::state::Desktop;
use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, RgbaImage};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

struct Frame {
    png: Vec<u8>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    source: &'static str,
}
impl Frame {
    fn from_png(png: Vec<u8>, x: i32, y: i32, source: &'static str) -> Result<Self> {
        let (width, height) =
            image::ImageReader::with_format(std::io::Cursor::new(&png), image::ImageFormat::Png)
                .into_dimensions()
                .map_err(|e| e.to_string())?;
        if width == 0 || height == 0 || width as u64 * height as u64 > 160_000_000 {
            return Err("Virtual desktop exceeds capture limit".into());
        }
        Ok(Self {
            png,
            x,
            y,
            width,
            height,
            source,
        })
    }
}

fn engine(app: &AppHandle) -> String {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value("screenshot-engine", json!("plugin"))
        .as_str()
        .unwrap_or("plugin")
        .to_owned()
}

/// 旧 js 设置值继续表示兼容后端；只有实际插件成功才标记为插件截图。
fn select_capture<T>(
    engine: &str,
    plugin: impl FnOnce() -> Result<T>,
    compatible: impl FnOnce() -> Result<T>,
) -> Result<T> {
    if engine != "js" {
        match plugin() {
            Ok(frame) => return Ok(frame),
            Err(error) => eprintln!(
                "[Capture] Screenshot plugin unavailable: {error}; using compatibility capture"
            ),
        }
    }
    compatible()
}

fn plugin_frame(app: &AppHandle, all: bool) -> Result<Frame> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
        };
        let path = crate::infrastructure::resources::native_path(
            app,
            "screenshot",
            "eIslandScreenshotHelper.dll",
        )?;
        let (x, y) = if all {
            unsafe {
                (
                    GetSystemMetrics(SM_XVIRTUALSCREEN),
                    GetSystemMetrics(SM_YVIRTUALSCREEN),
                )
            }
        } else {
            (0, 0)
        };
        let png = crate::infrastructure::platform::screenshot::capture(&path, all)?;
        Frame::from_png(png, x, y, "plugin")
    }
    #[cfg(not(windows))]
    {
        let _ = (app, all);
        Err("Screenshot plugin is only available on Windows".into())
    }
}

fn capture_frame(app: &AppHandle, selected: &str, all: bool) -> Result<Frame> {
    select_capture(
        selected,
        || plugin_frame(app, all),
        || compatible_frame(all),
    )
}

/// 按设置截取主显示器，不打开 WebView；截图插件失败时保留兼容后端。
pub async fn primary(app: &AppHandle) -> Result<Value> {
    static BUSY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if BUSY.swap(true, std::sync::atomic::Ordering::AcqRel) {
        return Ok(Value::Null);
    }
    let selected = engine(app);
    let app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let frame = capture_frame(&app, &selected, false)?;
        Ok(json!(format!(
            "data:image/png;base64,{}",
            STANDARD.encode(frame.png)
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
    capture_desktop(app).await
}

fn compatible_frame(all: bool) -> Result<Frame> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("No monitors available".into());
    }
    if !all {
        let monitor = monitors
            .iter()
            .find(|monitor| monitor.is_primary().unwrap_or(false))
            .unwrap_or(&monitors[0]);
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        let mut png = std::io::Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(image)
            .write_to(&mut png, image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        return Frame::from_png(png.into_inner(), 0, 0, "js");
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
    Frame::from_png(bytes.into_inner(), x, y, "js")
}

async fn capture_desktop(app: &AppHandle) -> Result<()> {
    let selected = engine(app);
    let capture_app = app.clone();
    let (frame, visible_windows) = tauri::async_runtime::spawn_blocking(move || {
        let frame = capture_frame(&capture_app, &selected, true)?;
        let visible_windows = xcap::Window::all().map_err(|e|e.to_string())?.iter().filter_map(|window| {
        if window.pid().ok()? == std::process::id() || window.is_minimized().ok()? { return None; }
        Some(json!({"x":window.x().ok()?,"y":window.y().ok()?,"width":window.width().ok()?,"height":window.height().ok()?,"title":window.title().ok()?}))
    }).collect::<Vec<_>>();
        Ok::<_, String>((frame, visible_windows))
    }).await.map_err(|e| e.to_string())??;
    let Frame {
        png,
        x,
        y,
        width,
        height,
        source,
    } = frame;
    let physical = json!({"x":x,"y":y,"width":width,"height":height});
    let payload = json!({
        "imageDataURL":format!("data:image/png;base64,{}", STANDARD.encode(png)),
        "virtualScreen":physical, "physicalScreen":physical,
        "displays":[], "scaleFactor":1, "captureSource":source, "visibleWindows":visible_windows
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plugin_selection_never_silently_replaces_the_requested_backend() {
        let value = select_capture("plugin", || Ok("plugin"), || panic!("Unexpected fallback"));
        assert_eq!(value.unwrap(), "plugin");
        assert_eq!(
            select_capture("js", || panic!("Plugin must not run"), || Ok("js")).unwrap(),
            "js"
        );
        assert_eq!(
            select_capture("invalid", || Ok("plugin"), || panic!("Unexpected fallback")).unwrap(),
            "plugin"
        );
    }

    #[test]
    fn unavailable_plugin_falls_back_and_preserves_compatibility_errors() {
        assert_eq!(
            select_capture("plugin", || Err("Missing DLL".into()), || Ok("js")).unwrap(),
            "js"
        );
        let failure: Result<()> = select_capture(
            "plugin",
            || Err("Plugin failed".into()),
            || Err("No monitors available".into()),
        );
        assert_eq!(failure.unwrap_err(), "No monitors available");
    }

    #[test]
    fn png_metadata_keeps_negative_virtual_origins_and_rejects_invalid_data() {
        let mut png = std::io::Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(RgbaImage::new(2, 3))
            .write_to(&mut png, image::ImageFormat::Png)
            .unwrap();
        let frame = Frame::from_png(png.into_inner(), -1920, -1080, "plugin").unwrap();
        assert_eq!(
            (frame.x, frame.y, frame.width, frame.height),
            (-1920, -1080, 2, 3)
        );
        assert_eq!(frame.source, "plugin");
        assert!(Frame::from_png(b"not a PNG".to_vec(), 0, 0, "plugin").is_err());
    }
}
