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
use image::{ImageEncoder, RgbaImage};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

/// 在启动截屏或修改窗口状态前检查平台是否支持截图。
pub(crate) fn check_supported() -> Result<()> {
    if cfg!(target_os = "macos") {
        return Err("Screen capture is unavailable on this platform".into());
    }
    Ok(())
}

#[derive(Clone, Copy)]
struct Screen {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

struct Frame {
    image: RgbaImage,
    screen: Screen,
    scale: u32,
    source: &'static str,
}

impl Frame {
    fn png(&self) -> Result<Vec<u8>> {
        let mut bytes = Vec::new();
        image::codecs::png::PngEncoder::new(&mut bytes)
            .write_image(
                self.image.as_raw(),
                self.image.width(),
                self.image.height(),
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| e.to_string())?;
        Ok(bytes)
    }
}

#[cfg(windows)]
fn prefers_compatibility(app: &AppHandle) -> bool {
    // 保留旧版截图设置值。js 指向 Rust 的兼容后端。
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value("screenshot-engine", Value::Null)
        .as_str()
        == Some("js")
}

#[cfg(windows)]
fn native_frame(all: bool) -> Result<Frame> {
    let (x, y, image) = crate::infrastructure::platform::screenshot::capture(all)?;
    let screen = Screen {
        x,
        y,
        width: image.width(),
        height: image.height(),
    };
    Ok(Frame {
        image,
        screen,
        scale: 1,
        source: "native",
    })
}

fn capture_frame(_app: &AppHandle, all: bool) -> Result<Frame> {
    #[cfg(windows)]
    if !prefers_compatibility(_app) {
        match native_frame(all) {
            Ok(frame) => return Ok(frame),
            Err(error) => {
                eprintln!("[Capture] Win32 GDI failed: {error}; using compatibility capture")
            }
        }
    }
    capture_displays(all)
}

/// 截取主显示器并返回 PNG data URL。
pub async fn primary(app: &AppHandle) -> Result<Value> {
    check_supported()?;
    static BUSY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if BUSY.swap(true, std::sync::atomic::Ordering::AcqRel) {
        return Ok(Value::Null);
    }
    let app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let frame = capture_frame(&app, false)?;
        Ok(json!(format!(
            "data:image/png;base64,{}",
            STANDARD.encode(frame.png()?)
        )))
    })
    .await
    .map_err(|e| e.to_string())
    .and_then(|value| value);
    BUSY.store(false, std::sync::atomic::Ordering::Release);
    result
}

/// 启动一次选区截图。进行中的重复触发会被忽略；旧选区窗口正在销毁时，请求在恢复后重新执行。
pub async fn start(app: &AppHandle) -> Result<()> {
    check_supported()?;
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if s.capture_active {
            if s.capture_closing {
                s.capture_restart = true;
            }
            return Ok(());
        }
        s.capture_active = true;
    }
    if let Err(error) = capture_hidden_desktop(app).await {
        close(app)?;
        return Err(error);
    }
    Ok(())
}

async fn capture_hidden_desktop(app: &AppHandle) -> Result<()> {
    let main = windows::main_window(app)?;
    main.hide().map_err(|e| e.to_string())?;

    let capture_app = app.clone();
    let frame = tauri::async_runtime::spawn_blocking(move || {
        // 保留合成器清除主窗口的时间，这段等待与隐藏 WebView 初始化重叠。
        std::thread::sleep(std::time::Duration::from_millis(80));
        let frame = capture_frame(&capture_app, true)?;
        Ok::<_, String>((frame, visible_windows()?))
    });

    // 隐藏的 WebView 与系统抓屏同时启动。收到像素并绘制前不会显示选区窗口。
    let window = windows::create(app, "capture")?;
    let (frame, visible_windows) = frame.await.map_err(|e| e.to_string())??;
    install_frame(app, &window, frame, visible_windows)
}

fn capture_displays(all: bool) -> Result<Frame> {
    let mut monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("No monitors available".into());
    }
    if !all {
        let primary = monitors
            .iter()
            .position(|monitor| monitor.is_primary().unwrap_or(false));
        monitors = vec![monitors.swap_remove(primary.unwrap_or(0))];
    }

    let screens: Vec<_> = monitors
        .iter()
        .map(|monitor| {
            Ok::<_, xcap::XCapError>(Screen {
                x: monitor.x()?,
                y: monitor.y()?,
                width: monitor.width()?,
                height: monitor.height()?,
            })
        })
        .collect::<std::result::Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let images = monitors
        .iter()
        .map(xcap::Monitor::capture_image)
        .collect::<std::result::Result<_, _>>()
        .map_err(|e| e.to_string())?;
    frame_from_displays(screens, images, all, "compatibility")
}

fn frame_from_displays(
    screens: Vec<Screen>,
    mut images: Vec<RgbaImage>,
    all: bool,
    source: &'static str,
) -> Result<Frame> {
    if !all {
        let image = images.pop().ok_or("No primary display image")?;
        let pixels = u64::from(image.width()) * u64::from(image.height());
        if !(1..=160_000_000).contains(&pixels) {
            return Err("Invalid primary display dimensions".into());
        }
        let screen = Screen {
            x: 0,
            y: 0,
            width: image.width(),
            height: image.height(),
        };
        return Ok(Frame {
            image,
            screen,
            scale: 1,
            source,
        });
    }
    compose_desktop(screens.into_iter().zip(images).collect(), source)
}

/// 在统一的像素密度下拼接屏幕，保留系统坐标以对齐选区和可见窗口。
fn compose_desktop(mut shots: Vec<(Screen, RgbaImage)>, source: &'static str) -> Result<Frame> {
    let first = shots.first().ok_or("No monitors available")?.0;
    let (mut x, mut y) = (first.x, first.y);
    let (mut right, mut bottom) = (i64::from(x), i64::from(y));
    let mut scale = 1;
    for (screen, image) in &shots {
        if screen.width == 0 || screen.height == 0 || image.width() == 0 || image.height() == 0 {
            return Err("Invalid display dimensions".into());
        }
        x = x.min(screen.x);
        y = y.min(screen.y);
        right = right.max(i64::from(screen.x) + i64::from(screen.width));
        bottom = bottom.max(i64::from(screen.y) + i64::from(screen.height));
        scale = scale
            .max(image.width().div_ceil(screen.width))
            .max(image.height().div_ceil(screen.height));
    }
    let width = u32::try_from(right - i64::from(x)).map_err(|e| e.to_string())?;
    let height = u32::try_from(bottom - i64::from(y)).map_err(|e| e.to_string())?;
    let screen = Screen {
        x,
        y,
        width,
        height,
    };
    let width = width
        .checked_mul(scale)
        .ok_or("Virtual desktop exceeds capture limit")?;
    let height = height
        .checked_mul(scale)
        .ok_or("Virtual desktop exceeds capture limit")?;
    if u64::from(width) * u64::from(height) > 160_000_000 {
        return Err("Virtual desktop exceeds capture limit".into());
    }
    if matches!(shots.as_slice(), [(_, image)] if image.dimensions() == (width, height)) {
        return Ok(Frame {
            image: shots.pop().unwrap().1,
            screen,
            scale,
            source,
        });
    }
    let mut image = RgbaImage::new(width, height);
    for (display, shot) in shots {
        let width = display.width * scale;
        let height = display.height * scale;
        let shot = if shot.dimensions() == (width, height) {
            shot
        } else {
            image::imageops::resize(&shot, width, height, image::imageops::FilterType::Triangle)
        };
        image::imageops::overlay(
            &mut image,
            &shot,
            (i64::from(display.x) - i64::from(x)) * i64::from(scale),
            (i64::from(display.y) - i64::from(y)) * i64::from(scale),
        );
    }
    Ok(Frame {
        image,
        screen,
        scale,
        source,
    })
}

fn visible_windows() -> Result<Vec<Value>> {
    Ok(xcap::Window::all()
        .map_err(|e| e.to_string())?
        .iter()
        .filter_map(|window| {
            if window.pid().ok()? == std::process::id() || window.is_minimized().ok()? {
                return None;
            }
            Some(json!({
                "x": window.x().ok()?, "y": window.y().ok()?,
                "width": window.width().ok()?, "height": window.height().ok()?,
                "title": window.title().ok()?
            }))
        })
        .collect())
}

fn install_frame(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
    frame: Frame,
    visible_windows: Vec<Value>,
) -> Result<()> {
    let Frame {
        image,
        screen:
            Screen {
                x,
                y,
                width,
                height,
            },
        scale,
        source,
    } = frame;
    let payload = json!({
        "virtualScreen": {"x": x, "y": y, "width": width, "height": height},
        "physicalScreen": {"x": i64::from(x) * i64::from(scale), "y": i64::from(y) * i64::from(scale), "width": image.width(), "height": image.height()},
        "displays": [], "scaleFactor": scale, "captureSource": source, "visibleWindows": visible_windows
    });
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window
        .set_zoom(1. / window.scale_factor().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        s.capture_pixels = Some(image.into_raw());
        s.capture_payload = Some(payload);
    }
    send_frame_if_ready(app)
}

/// 选区渲染器可以在抓屏之前或之后就绪。
pub fn ready(app: &AppHandle) -> Result<()> {
    app.state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .capture_renderer_ready = true;
    send_frame_if_ready(app)
}

fn send_frame_if_ready(app: &AppHandle) -> Result<()> {
    let payload = {
        let state = app.state::<Desktop>();
        let mut s = state.inner.lock().unwrap();
        if !s.capture_renderer_ready {
            return Ok(());
        }
        s.capture_payload.take()
    };
    if let Some(payload) = payload {
        windows::emit(app, "capture", "capture-image", json!([payload]))?;
    }
    Ok(())
}

/// 领取当前截图的 RGBA 像素，交付后立即从 Rust 状态中移除。
pub(crate) fn take_pixels(app: &AppHandle) -> Result<Vec<u8>> {
    app.state::<Desktop>()
        .inner
        .lock()
        .unwrap()
        .capture_pixels
        .take()
        .ok_or_else(|| "No screenshot pixels available".into())
}

/// 第一帧已绘制后显示选区窗口。
pub(crate) fn show(window: &tauri::WebviewWindow) -> Result<()> {
    #[cfg(windows)]
    if let Err(error) = crate::infrastructure::platform::window::disable_transitions(window) {
        eprintln!("[Capture] Could not disable window transitions: {error}");
    }

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

pub fn close(app: &AppHandle) -> Result<()> {
    if let Some(window) = app.get_webview_window("capture") {
        // Destroyed 事件负责恢复主窗口并释放本次截图状态。
        app.state::<Desktop>().inner.lock().unwrap().capture_closing = true;
        return window.destroy().map_err(|e| e.to_string());
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
    use image::Rgba;

    #[test]
    fn desktop_keeps_negative_origins_and_mixed_density_display_positions() {
        let left = Screen {
            x: -2,
            y: 0,
            width: 2,
            height: 2,
        };
        let top = Screen {
            x: 0,
            y: -1,
            width: 1,
            height: 1,
        };
        let red = Rgba([255, 0, 0, 255]);
        let blue = Rgba([0, 0, 255, 255]);
        let frame = compose_desktop(
            vec![
                (left, RgbaImage::from_pixel(2, 2, red)),
                (top, RgbaImage::from_pixel(2, 2, blue)),
            ],
            "native",
        )
        .unwrap();

        let screen = frame.screen;
        assert_eq!(
            (screen.x, screen.y, screen.width, screen.height, frame.scale),
            (-2, -1, 3, 3, 2)
        );
        let png = image::load_from_memory(&frame.png().unwrap())
            .unwrap()
            .into_rgba8();
        assert_eq!(png.dimensions(), (6, 6));
        assert_eq!(*png.get_pixel(0, 2), red);
        assert_eq!(*png.get_pixel(4, 0), blue);
        assert_eq!(png.get_pixel(0, 0)[3], 0);
    }

    #[test]
    fn desktop_rejects_empty_or_oversized_geometry_before_allocating() {
        assert!(compose_desktop(Vec::new(), "native").is_err());
        let screen = Screen {
            x: 0,
            y: 0,
            width: u32::MAX,
            height: 2,
        };
        assert!(compose_desktop(vec![(screen, RgbaImage::new(1, 1))], "native").is_err());
    }
}
