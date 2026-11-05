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

//! Initialize paths, managed state, services and the first windows in order.

use crate::{
    features::windowing,
    infrastructure::storage::{paths, AppPaths},
    state::Desktop,
};
use tauri::Manager;

pub(super) fn initialize(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(debug_assertions)]
    let debug_directory = std::env::var_os("EISLAND_DATA_DIR").map(std::path::PathBuf::from);
    #[cfg(not(debug_assertions))]
    let debug_directory: Option<std::path::PathBuf> = None;
    let directory = paths::select(
        &app.path().app_data_dir()?,
        &app.path().config_dir()?,
        debug_directory.as_deref(),
    );
    let paths = AppPaths::new(directory);
    let store = paths.store_dir.clone();
    app.manage(paths);
    app.manage(Desktop::new(store));
    super::services::start(app.handle());
    windowing::create(app.handle(), "main")?;
    windowing::reposition(app.handle())?;
    let scale = app.state::<Desktop>().inner.lock().unwrap().scale;
    app.state::<Desktop>().inner.lock().unwrap().backing.width = 860. * scale / 100.;
    windowing::reposition(app.handle())?;
    windowing::main_window(app.handle())?.set_zoom(scale / 100.)?;
    let splash = app
        .state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .value("startup-animation-enabled", serde_json::json!(true))
        != false;
    if splash {
        windowing::create(app.handle(), "splash")?;
    } else {
        app.state::<Desktop>().inner.lock().unwrap().splash_done = true;
    }
    super::tray::create(app)?;
    windowing::shortcuts::register_shortcuts(app.handle())?;
    windowing::auto_hide::start(app.handle());
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(8)).await;
        if let Err(error) = windowing::close_splash(&handle) {
            eprintln!("[Startup] {error}");
        }
    });
    Ok(())
}
