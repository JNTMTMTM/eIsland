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

//! CoreGraphics 窗口元数据检测；不用窗口标题，避免依赖屏幕录制授权。

use super::fills_display;
use objc2_core_foundation::{CFDictionary, CFNumber, CFString, CGRect};
use objc2_core_graphics::{
    kCGWindowAlpha, kCGWindowBounds, kCGWindowLayer, kCGWindowOwnerPID, CGDisplayBounds, CGError,
    CGGetActiveDisplayList, CGRectMakeWithDictionaryRepresentation, CGWindowListCopyWindowInfo,
    CGWindowListOption,
};

fn edges(rect: CGRect) -> [f64; 4] {
    [
        rect.origin.x,
        rect.origin.y,
        rect.origin.x + rect.size.width,
        rect.origin.y + rect.size.height,
    ]
}

fn number(dictionary: &CFDictionary, key: &CFString) -> Option<f64> {
    // CoreGraphics 为数值键返回 CFNumber；引用不超过所属字典的生命周期。
    unsafe {
        dictionary
            .value(std::ptr::from_ref(key).cast())
            .cast::<CFNumber>()
            .as_ref()?
            .as_f64()
    }
}

/// 比较当前 Space 的可见应用窗口与各显示器的完整逻辑边界。
pub(crate) fn any() -> Result<bool, String> {
    let mut count = 0;
    if unsafe { CGGetActiveDisplayList(0, std::ptr::null_mut(), &mut count) } != CGError::Success {
        return Err("Cannot enumerate active displays".into());
    }
    let mut displays = vec![0; count as usize];
    if count == 0 {
        return Ok(false);
    }
    if unsafe { CGGetActiveDisplayList(count, displays.as_mut_ptr(), &mut count) }
        != CGError::Success
    {
        return Err("Cannot read active displays".into());
    }
    displays.truncate(count as usize);
    let bounds: Vec<_> = displays
        .into_iter()
        .map(|id| edges(CGDisplayBounds(id)))
        .collect();
    let windows = CGWindowListCopyWindowInfo(
        CGWindowListOption::OptionOnScreenOnly | CGWindowListOption::ExcludeDesktopElements,
        0,
    )
    .ok_or("Cannot enumerate onscreen windows")?;
    for index in 0..windows.len() {
        // Apple 将列表元素定义为 CFDictionary；窗口标题是可选键，不参与检测。
        unsafe {
            let Some(window) = windows
                .value_at_index(index as isize)
                .cast::<CFDictionary>()
                .as_ref()
            else {
                continue;
            };
            let pid = number(window, kCGWindowOwnerPID);
            if pid.is_none()
                || pid == Some(std::process::id() as f64)
                || number(window, kCGWindowLayer) != Some(0.)
                || !number(window, kCGWindowAlpha).is_some_and(|alpha| alpha > 0.)
            {
                continue;
            }
            let dictionary = window
                .value(std::ptr::from_ref(kCGWindowBounds).cast())
                .cast::<CFDictionary>()
                .as_ref();
            let mut rect = CGRect::default();
            if CGRectMakeWithDictionaryRepresentation(dictionary, &mut rect)
                && bounds
                    .iter()
                    .any(|display| fills_display(edges(rect), *display))
            {
                return Ok(true);
            }
        }
    }
    Ok(false)
}
