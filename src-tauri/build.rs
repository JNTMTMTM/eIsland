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
 
fn main() {
    println!("cargo:rerun-if-changed=../src/preload");
    println!("cargo:rerun-if-changed=../src/shared");
    println!("cargo:rerun-if-changed=../src/tauri");
    println!("cargo:rerun-if-changed=../scripts/tauri/build-bridge.mjs");
    let result = std::process::Command::new("node")
        .arg("../scripts/tauri/build-bridge.mjs")
        .status()
        .expect("Node.js is required to build the renderer bridge");
    assert!(
        result.success(),
        "Failed to build the Tauri renderer bridge"
    );
    tauri_build::build();
}
