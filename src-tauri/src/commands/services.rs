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

//! 业务域服务路由；保持原生协议的既定分发优先级。

use crate::{
    features::{
        capture::tools as capture_tools, downloads, extensions, files, images, mail, media, music,
        runtime, system, updater,
    },
    shared::Result,
};
use serde_json::Value;
use tauri::AppHandle;

pub(super) async fn handle(
    app: &AppHandle,
    channel: &str,
    args: &[Value],
) -> Option<Result<Value>> {
    if extensions::handles(channel) {
        return Some(extensions::handle(app, channel, args).await);
    }
    if updater::handles(channel) {
        return Some(updater::handle(app, channel, args).await);
    }
    if images::handles(channel) {
        return Some(images::handle(app, channel, args).await);
    }
    if runtime::handles(channel) {
        return Some(runtime::handle(app, channel, args).await);
    }
    if mail::handles(channel) {
        return Some(mail::handle(app, channel, args).await);
    }
    if downloads::handles(channel) {
        return Some(downloads::handle(app, channel, args).await);
    }
    if capture_tools::handles(channel) {
        return Some(capture_tools::handle(app, channel, args).await);
    }
    if files::handles(channel) {
        return Some(files::handle(app, channel, args).await);
    }
    if system::handles(channel) {
        return Some(system::handle(app, channel, args).await);
    }
    if media::handles(channel) {
        return Some(media::handle(app, channel, args).await);
    }
    if music::handles(channel) {
        return Some(music::handle(app, channel, args).await);
    }
    None
}
