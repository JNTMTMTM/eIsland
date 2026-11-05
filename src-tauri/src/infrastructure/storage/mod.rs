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

//! 业务数据目录与持久化存储，不依赖业务功能。

pub(crate) mod paths;
mod store;
use std::path::PathBuf;
pub(crate) use store::Store;
use tauri::{AppHandle, Manager};

/// 应用初始化时固定的业务目录，和 WebView 配置目录独立。
pub(crate) struct AppPaths {
    pub data_dir: PathBuf,
    pub store_dir: PathBuf,
}
impl AppPaths {
    pub(crate) fn new(store_dir: PathBuf) -> Self {
        let data_dir = store_dir.parent().unwrap_or(&store_dir).to_path_buf();
        Self {
            data_dir,
            store_dir,
        }
    }
}
/// 读取初始化后的业务数据目录。
pub(crate) fn data_dir(app: &AppHandle) -> PathBuf {
    app.state::<AppPaths>().data_dir.clone()
}
