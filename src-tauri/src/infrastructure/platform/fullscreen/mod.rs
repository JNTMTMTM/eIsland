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

//! 全屏自动隐藏所需的原生窗口检测，不依赖 Node 插件或外部进程。

#[cfg(windows)]
mod windows;

#[cfg(windows)]
pub(crate) use windows::any;

/// 比较同一坐标系中的四条边，保留旧检测器的 2 单位容差。
#[cfg(any(not(target_os = "macos"), test))]
fn fills_display(window: [f64; 4], display: [f64; 4]) -> bool {
    [window, display].iter().all(|rect| {
        rect.iter().all(|edge| edge.is_finite()) && rect[2] > rect[0] && rect[3] > rect[1]
    }) && window.iter().zip(display).all(|(a, b)| (a - b).abs() <= 2.)
}

#[cfg(target_os = "macos")]
pub(crate) fn any() -> Result<bool, String> {
    Ok(false)
}

/// 其他平台沿用 Rust 窗口枚举，读取失败时不把缺失尺寸当成相等。
#[cfg(not(any(windows, target_os = "macos")))]
pub(crate) fn any() -> Result<bool, String> {
    let windows = xcap::Window::all().map_err(|error| error.to_string())?;
    for window in windows {
        if window.pid().ok() == Some(std::process::id()) || window.is_minimized().unwrap_or(true) {
            continue;
        }
        let geometry = (|| {
            let monitor = window.current_monitor().ok()?;
            let x = window.x().ok()? as f64;
            let y = window.y().ok()? as f64;
            let mx = monitor.x().ok()? as f64;
            let my = monitor.y().ok()? as f64;
            Some(fills_display(
                [
                    x,
                    y,
                    x + window.width().ok()? as f64,
                    y + window.height().ok()? as f64,
                ],
                [
                    mx,
                    my,
                    mx + monitor.width().ok()? as f64,
                    my + monitor.height().ok()? as f64,
                ],
            ))
        })();
        if geometry == Some(true) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::fills_display;

    #[test]
    fn compares_all_edges_with_tolerance_on_negative_and_scaled_displays() {
        for display in [
            [0., 0., 1920., 1080.],
            [-2560., -200., 0., 1240.],
            [1920., 0., 3648., 1117.],
        ] {
            assert!(fills_display(display, display));
            for edge in 0..4 {
                for delta in [-3., -2., 2., 3.] {
                    let mut window = display;
                    window[edge] += delta;
                    assert_eq!(fills_display(window, display), delta.abs() <= 2.);
                }
            }
        }
    }

    #[test]
    fn rejects_work_area_spanning_and_invalid_bounds() {
        let display = [0., 0., 1920., 1080.];
        for window in [
            [0., 0., 1920., 1040.],
            [0., 24., 1920., 1080.],
            [0., 0., 3840., 1080.],
            [0.; 4],
            [0., 0., -1., 1080.],
            [f64::NAN, 0., 1920., 1080.],
        ] {
            assert!(!fills_display(window, display));
            assert!(!fills_display(display, window));
        }
    }
}
