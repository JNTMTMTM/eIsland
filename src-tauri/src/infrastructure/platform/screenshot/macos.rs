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

//! 使用系统 ScreenCaptureKit 单帧接口抓取显示器图像。

use crate::shared::Result;
use block2::RcBlock;
use image::RgbaImage;
use objc2::{
    msg_send,
    rc::{autoreleasepool, Allocated, Retained},
    runtime::{AnyClass, AnyObject, Bool},
};
use objc2_core_foundation::{CGPoint, CGRect, CGSize};
use objc2_core_graphics::{
    CGBitmapContextCreate, CGColorSpace, CGContext, CGImage, CGImageAlphaInfo,
    CGPreflightScreenCaptureAccess, CGRequestScreenCaptureAccess,
};
use objc2_foundation::{NSArray, NSError};
use std::{
    ffi::c_void,
    sync::{mpsc, OnceLock},
    time::{Duration, Instant},
};

#[derive(Clone, Copy)]
pub(crate) struct DisplayRequest {
    pub id: u32,
    pub width: u32,
    pub height: u32,
}

type DisplayImage = Result<(usize, RgbaImage)>;

/// 在阻塞线程等待系统回调。没有单帧接口的系统使用旧版兼容后端。
pub(crate) fn capture(displays: Vec<DisplayRequest>) -> Result<Option<Vec<RgbaImage>>> {
    if !CGPreflightScreenCaptureAccess() && !CGRequestScreenCaptureAccess() {
        return Err("Screen capture requires macOS Screen Recording permission".into());
    }

    static FRAMEWORK: OnceLock<Option<libloading::Library>> = OnceLock::new();
    let Some(_) = FRAMEWORK.get_or_init(|| {
        // 动态加载系统框架，避免旧版 macOS 在进程启动时解析不可用的类。
        unsafe {
            libloading::Library::new(
                "/System/Library/Frameworks/ScreenCaptureKit.framework/ScreenCaptureKit",
            )
        }
        .ok()
    }) else {
        return Ok(None);
    };
    let Some(manager) = AnyClass::get(c"SCScreenshotManager") else {
        return Ok(None);
    };
    let shareable = AnyClass::get(c"SCShareableContent").ok_or("Missing SCShareableContent")?;
    let filter = AnyClass::get(c"SCContentFilter").ok_or("Missing SCContentFilter")?;
    let configuration =
        AnyClass::get(c"SCStreamConfiguration").ok_or("Missing SCStreamConfiguration")?;
    let count = displays.len();
    let (sender, receiver) = mpsc::channel::<DisplayImage>();
    let share_callback = RcBlock::new(move |content: *mut AnyObject, error: *mut NSError| {
        let Some(content) = (unsafe { content.as_ref() }) else {
            let _ = sender.send(Err(capture_error(error)));
            return;
        };
        let available: Retained<NSArray<AnyObject>> = unsafe { msg_send![content, displays] };
        for (index, display) in displays.iter().enumerate() {
            let result = capture_display(
                manager,
                filter,
                configuration,
                &available,
                *display,
                index,
                &sender,
            );
            if let Err(error) = result {
                let _ = sender.send(Err(error));
                break;
            }
        }
    });

    // ScreenCaptureKit 会复制 completion block。Objective-C 句柄只在回调中使用。
    autoreleasepool(|_| unsafe {
        let _: () = msg_send![shareable,
            getShareableContentExcludingDesktopWindows: Bool::NO,
            onScreenWindowsOnly: Bool::YES,
            completionHandler: &*share_callback
        ];
    });
    let deadline = Instant::now() + Duration::from_secs(10);
    let mut images = vec![None; count];
    for _ in 0..count {
        let (index, image) = receiver
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
            .map_err(|error| format!("ScreenCaptureKit callback failed: {error}"))??;
        images[index] = Some(image);
    }
    images
        .into_iter()
        .collect::<Option<Vec<_>>>()
        .map(Some)
        .ok_or_else(|| "ScreenCaptureKit did not capture every display".into())
}

fn capture_display(
    manager: &AnyClass,
    filter: &AnyClass,
    configuration: &AnyClass,
    available: &NSArray<AnyObject>,
    display: DisplayRequest,
    index: usize,
    sender: &mpsc::Sender<DisplayImage>,
) -> Result<()> {
    let display_object = (0..available.count())
        .map(|position| available.objectAtIndex(position))
        .find(|object| {
            let id: u32 = unsafe { msg_send![&**object, displayID] };
            id == display.id
        })
        .ok_or_else(|| format!("Display {} disappeared before capture", display.id))?;
    let excluded = NSArray::<AnyObject>::new();
    unsafe {
        let allocated: Allocated<AnyObject> = msg_send![filter, alloc];
        let filter: Retained<AnyObject> = msg_send![
            allocated,
            initWithDisplay: &*display_object, excludingWindows: &*excluded
        ];
        let scale: f32 = msg_send![&*filter, pointPixelScale];
        let width = (f64::from(display.width) * f64::from(scale)).round() as usize;
        let height = (f64::from(display.height) * f64::from(scale)).round() as usize;
        checked_layout(width, height)?;
        let configuration: Retained<AnyObject> = msg_send![configuration, new];
        let _: () = msg_send![&*configuration, setWidth: width];
        let _: () = msg_send![&*configuration, setHeight: height];
        let _: () = msg_send![&*configuration, setShowsCursor: Bool::NO];
        let sender = sender.clone();
        let callback = RcBlock::new(move |image: *mut c_void, error: *mut NSError| {
            let result = match image.cast::<CGImage>().as_ref() {
                Some(image) => rgba(image).map(|image| (index, image)),
                None => Err(capture_error(error)),
            };
            let _ = sender.send(result);
        });
        let _: () = msg_send![manager,
            captureImageWithFilter: &*filter, configuration: &*configuration,
            completionHandler: &*callback
        ];
    }
    Ok(())
}

fn capture_error(error: *mut NSError) -> String {
    unsafe { error.as_ref() }
        .map(|error| error.localizedDescription().to_string())
        .unwrap_or_else(|| "ScreenCaptureKit returned no image".into())
}

fn checked_layout(width: usize, height: usize) -> Result<usize> {
    let pixels = width
        .checked_mul(height)
        .filter(|pixels| (1..=160_000_000).contains(pixels));
    pixels
        .map(|pixels| pixels * 4)
        .ok_or_else(|| "Invalid screen capture dimensions".into())
}

fn rgba(image: &CGImage) -> Result<RgbaImage> {
    let width = CGImage::width(Some(image));
    let height = CGImage::height(Some(image));
    let mut bytes = vec![0; checked_layout(width, height)?];
    let color_space =
        CGColorSpace::new_device_rgb().ok_or("Could not create an RGB color space")?;
    {
        // RGBX 统一窗体服务器返回的像素格式与行布局。
        let context = unsafe {
            CGBitmapContextCreate(
                bytes.as_mut_ptr().cast(),
                width,
                height,
                8,
                width * 4,
                Some(&color_space),
                CGImageAlphaInfo::NoneSkipLast.0,
            )
        }
        .ok_or("Could not allocate a screenshot bitmap context")?;
        let bounds = CGRect::new(
            CGPoint::new(0., 0.),
            CGSize::new(width as f64, height as f64),
        );
        CGContext::draw_image(Some(&context), bounds, Some(image));
    }
    for pixel in bytes.as_chunks_mut::<4>().0 {
        pixel[3] = 255;
    }
    RgbaImage::from_raw(width as u32, height as u32, bytes)
        .ok_or("Invalid screenshot buffer".into())
}
