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

//! Explicit packaged-artifact verification. No installer is ever launched.
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::json;
use std::{fs, sync::Arc};
use tauri::test::{mock_builder, mock_context, noop_assets};
use tauri_plugin_updater::UpdaterExt;

#[test]
#[ignore = "Requires an isolated signed NSIS fixture; run explicitly after local packaging"]
fn actual_nsis_signature_version_and_bytes_are_verified_by_the_official_updater() {
    let installer =
        std::env::var("EISLAND_SIGNED_INSTALLER").expect("EISLAND_SIGNED_INSTALLER is required");
    let public_key =
        std::env::var("TAURI_UPDATER_PUBLIC_KEY").expect("TAURI_UPDATER_PUBLIC_KEY is required");
    let bytes = Arc::new(fs::read(&installer).unwrap());
    assert!(bytes.starts_with(b"MZ"));
    let signature = fs::read_to_string(format!("{installer}.sig"))
        .unwrap()
        .trim()
        .to_owned();
    let decoded = String::from_utf8(STANDARD.decode(&signature).unwrap()).unwrap();
    assert!(decoded.contains(&format!("version:{}", env!("CARGO_PKG_VERSION"))));
    let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
    let base = format!("http://{}", server.server_addr());
    let manifest = json!({"version":env!("CARGO_PKG_VERSION"),"platforms":{"windows-x86_64":{"url":format!("{base}/fixture-setup.exe"),"signature":signature}}});
    let payload = bytes.clone();
    let body = serde_json::to_vec(&manifest).unwrap();
    let worker = std::thread::spawn(move || {
        for _ in 0..2 {
            let request = server.recv().unwrap();
            let response = if request.url() == "/latest.json" {
                tiny_http::Response::from_data(body.clone())
            } else {
                tiny_http::Response::from_data((*payload).clone())
            };
            request.respond(response).unwrap();
        }
    });
    let mut context = mock_context(noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        json!({"pubkey":public_key,"requireSignedVersion":true}),
    );
    let app = mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    tauri::async_runtime::block_on(async {
        let update = app
            .updater_builder()
            .endpoints(vec![format!("{base}/latest.json").parse().unwrap()])
            .unwrap()
            .build()
            .unwrap()
            .check()
            .await
            .unwrap()
            .unwrap();
        let downloaded = update.download(|_, _| {}, || {}).await.unwrap();
        assert_eq!(downloaded.as_slice(), bytes.as_slice());
        update.verify(&downloaded).unwrap();
        let mut changed = downloaded;
        changed[0] ^= 1;
        assert!(update.verify(&changed).is_err());
        let mut changed_version = update.clone();
        changed_version.version = "999.0.0".into();
        assert!(changed_version.verify(bytes.as_slice()).is_err());
    });
    worker.join().unwrap();
}
