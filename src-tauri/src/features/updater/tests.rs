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

//! Official plugin protocol tests use ephemeral keys and never execute an installer.
use super::*;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::{
    io::Cursor,
    sync::atomic::{AtomicBool, Ordering},
    thread::JoinHandle,
};
use tauri::test::{mock_builder, mock_context, noop_assets, MockRuntime};

struct Feed {
    server: Arc<tiny_http::Server>,
    stop: Arc<AtomicBool>,
    worker: Option<JoinHandle<()>>,
    manifest: Arc<Mutex<Value>>,
    truncated: Arc<AtomicBool>,
    url: reqwest::Url,
    bytes: Vec<u8>,
    key: String,
}
impl Feed {
    fn new() -> Self {
        let pair = minisign::KeyPair::generate_unencrypted_keypair().unwrap();
        let bytes = b"MZ signed updater fixture, never executed".to_vec();
        let signature = minisign::sign(
            None,
            &pair.sk,
            Cursor::new(&bytes),
            Some("timestamp:1\tfile:fixture.exe\tversion:99.0.0"),
            None,
        )
        .unwrap();
        let key = STANDARD.encode(pair.pk.to_box().unwrap().to_string());
        let server = Arc::new(tiny_http::Server::http("127.0.0.1:0").unwrap());
        let url =
            reqwest::Url::parse(&format!("http://{}/latest.json", server.server_addr())).unwrap();
        let manifest = Arc::new(Mutex::new(
            json!({"runtime":"tauri","version":"99.0.0","notes":"native notes","platforms":{"windows-x86_64":{"url":url.join("fixture.exe").unwrap().to_string(),"signature":STANDARD.encode(signature.to_string()),"format":"nsis","size":bytes.len(),"sha512":"legacy-compatibility-field"}}}),
        ));
        let stop = Arc::new(AtomicBool::new(false));
        let truncated = Arc::new(AtomicBool::new(false));
        let worker = {
            let (server, stop, truncated, manifest, bytes) = (
                server.clone(),
                stop.clone(),
                truncated.clone(),
                manifest.clone(),
                bytes.clone(),
            );
            std::thread::spawn(move || {
                while !stop.load(Ordering::SeqCst) {
                    let Ok(Some(request)) = server.recv_timeout(Duration::from_millis(50)) else {
                        continue;
                    };
                    let response = if request.url() == "/latest.json" {
                        tiny_http::Response::from_data(
                            serde_json::to_vec(&*manifest.lock().unwrap()).unwrap(),
                        )
                    } else {
                        tiny_http::Response::new(
                            tiny_http::StatusCode(200),
                            vec![],
                            Cursor::new(bytes.clone()),
                            Some(
                                bytes.len()
                                    + if truncated.load(Ordering::SeqCst) {
                                        100
                                    } else {
                                        0
                                    },
                            ),
                            None,
                        )
                    };
                    let _ = request.respond(response);
                }
            })
        };
        Self {
            server,
            stop,
            worker: Some(worker),
            manifest,
            truncated,
            url,
            bytes,
            key,
        }
    }
    fn app(&self) -> tauri::App<MockRuntime> {
        let mut context = mock_context(noop_assets());
        context.config_mut().plugins.0.insert(
            "updater".into(),
            json!({"pubkey":self.key,"requireSignedVersion":true}),
        );
        mock_builder()
            .plugin(tauri_plugin_updater::Builder::new().build())
            .build(context)
            .unwrap()
    }
}
impl Drop for Feed {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        self.server.unblock();
        if let Some(worker) = self.worker.take() {
            worker.join().unwrap();
        }
    }
}

#[test]
fn official_plugin_accepts_transition_json_and_verifies_download_without_installing() {
    tauri::async_runtime::block_on(async {
        let feed = Feed::new();
        let app = feed.app();
        let update = check_feed(app.handle(), feed.url.clone())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(update.body.as_deref(), Some("native notes"));
        let mut count = 0;
        let bytes = update
            .download(|length, _| count += length, || {})
            .await
            .unwrap();
        assert_eq!(bytes, feed.bytes);
        assert_eq!(count, bytes.len());
        update.verify(&bytes).unwrap();
        let mut corrupt = bytes;
        corrupt[2] ^= 1;
        assert!(update.verify(&corrupt).is_err());
        let path = std::env::temp_dir().join(format!(
            "eisland-updater-verify-{}.bin",
            uuid::Uuid::new_v4()
        ));
        std::fs::write(&path, &feed.bytes).unwrap();
        verification::verify_file(&path, &update.signature, &feed.key).unwrap();
        assert!(verification::verify_file(&path, &update.signature, "invalid").is_err());
        std::fs::write(&path, corrupt).unwrap();
        assert!(verification::verify_file(&path, &update.signature, &feed.key).is_err());
        std::fs::remove_file(path).unwrap();
    });
}
#[test]
fn official_comparator_rejects_equal_and_older_versions_and_accepts_newer() {
    tauri::async_runtime::block_on(async {
        let feed = Feed::new();
        let app = feed.app();
        for version in ["0.0.1", "0.1.0"] {
            feed.manifest.lock().unwrap()["version"] = json!(version);
            assert!(check_feed(app.handle(), feed.url.clone())
                .await
                .unwrap()
                .is_none());
        }
        feed.manifest.lock().unwrap()["version"] = json!("0.1.1");
        assert!(check_feed(app.handle(), feed.url.clone())
            .await
            .unwrap()
            .is_some());
        feed.manifest.lock().unwrap()["version"] = json!("broken");
        assert!(check_feed(app.handle(), feed.url.clone()).await.is_err());
    });
}
#[test]
fn official_signatures_reject_wrong_key_replayed_version_missing_signature_and_truncation() {
    tauri::async_runtime::block_on(async {
        let feed = Feed::new();
        let app = feed.app();
        let update = check_feed(app.handle(), feed.url.clone())
            .await
            .unwrap()
            .unwrap();
        feed.manifest.lock().unwrap()["version"] = json!("100.0.0");
        let switched = check_feed(app.handle(), feed.url.clone())
            .await
            .unwrap()
            .unwrap();
        assert!(switched.verify(&feed.bytes).is_err());
        let other = Feed::new();
        let wrong_app = other.app();
        let wrong = check_feed(wrong_app.handle(), feed.url.clone())
            .await
            .unwrap()
            .unwrap();
        assert!(wrong.verify(&feed.bytes).is_err());
        feed.truncated.store(true, Ordering::SeqCst);
        assert!(update.download(|_, _| {}, || {}).await.is_err());
        feed.manifest.lock().unwrap()["platforms"]["windows-x86_64"]["signature"] = Value::Null;
        assert!(check_feed(app.handle(), feed.url.clone()).await.is_err());
    });
}
#[test]
fn source_compatibility_has_one_default_and_preserves_explicit_server_feeds() {
    use sources::endpoint;
    assert!(endpoint(None, None)
        .unwrap()
        .as_str()
        .contains("eisland-update/tauri/latest.json"));
    for source in ["tencent-cos", "aliyun-oss"] {
        assert!(endpoint(Some(&json!(source)), None).is_err());
        for base in [
            "https://mirror.test",
            "https://mirror.test/eisland-update",
            "https://mirror.test/eisland-update/tauri",
        ] {
            assert_eq!(
                endpoint(Some(&json!(source)), Some(&json!(base)))
                    .unwrap()
                    .as_str(),
                "https://mirror.test/eisland-update/tauri/latest.json"
            );
        }
        let signed = "https://mirror.test/eisland-update/tauri/latest.json?token=fixture";
        assert_eq!(
            endpoint(Some(&json!(source)), Some(&json!(signed)))
                .unwrap()
                .as_str(),
            signed
        );
        for invalid in [
            "file:///manifest.json",
            "https://user:secret@mirror.test/latest.json",
            "https://mirror.test/latest.yml",
            "https://mirror.test/base?signature=value",
        ] {
            assert!(endpoint(Some(&json!(source)), Some(&json!(invalid))).is_err());
        }
    }
    assert!(
        sources::secure_url(&reqwest::Url::parse("http://example.test/latest.json").unwrap())
            .is_err()
    );
}

#[test]
fn ipc_checks_and_failed_version_switches_invalidate_cached_installer_without_installing() {
    tauri::async_runtime::block_on(async {
        let feed = Feed::new();
        let app = feed.app();
        app.manage(Updater {
            operation: tokio::sync::Mutex::new(()),
            downloaded: Mutex::new(None),
            startup: Mutex::new(Some(42)),
        });
        let args = [json!("tencent-cos"), json!(feed.url.as_str())];
        assert_eq!(
            handle(app.handle(), "updater:startup-auto-check-ready", &[])
                .await
                .unwrap()["requestedAt"],
            42
        );
        handle(
            app.handle(),
            "updater:startup-auto-check-received",
            &[json!(41)],
        )
        .await
        .unwrap();
        assert_eq!(*app.state::<Updater>().startup.lock().unwrap(), Some(42));
        handle(
            app.handle(),
            "updater:startup-auto-check-received",
            &[json!(42)],
        )
        .await
        .unwrap();
        assert!(
            handle(app.handle(), "updater:startup-auto-check-ready", &[])
                .await
                .unwrap()
                .is_null()
        );
        assert_eq!(
            handle(app.handle(), "updater:download", &args)
                .await
                .unwrap(),
            true
        );
        assert_eq!(
            app.state::<Updater>()
                .downloaded
                .lock()
                .unwrap()
                .as_ref()
                .unwrap()
                .update
                .version,
            "99.0.0"
        );
        assert_eq!(
            handle(app.handle(), "updater:check", &args).await.unwrap()["available"],
            true
        );
        assert!(app.state::<Updater>().downloaded.lock().unwrap().is_some());
        feed.manifest.lock().unwrap()["version"] = json!("100.0.0");
        assert_eq!(
            handle(app.handle(), "updater:check", &args).await.unwrap()["available"],
            true
        );
        assert!(app.state::<Updater>().downloaded.lock().unwrap().is_none());
        assert_eq!(
            handle(app.handle(), "updater:download", &args)
                .await
                .unwrap(),
            false
        );
        assert!(app.state::<Updater>().downloaded.lock().unwrap().is_none());
        assert!(handle(app.handle(), "not-an-updater-command", &[])
            .await
            .is_err());
        let invalid = [json!("tencent-cos"), json!("file:///invalid")];
        assert!(handle(app.handle(), "updater:check", &invalid)
            .await
            .unwrap()["error"]
            .is_string());
    });
}
#[test]
fn cdn_routes_installer_bytes_without_rewriting_signed_origin_or_github_urls() {
    let origin = reqwest::Url::parse(
        "https://origin.test/eisland-update/tauri/eIsland_99.0.0_x64-setup.exe?signature=fixture",
    )
    .unwrap();
    let feed = reqwest::Url::parse("https://cdn.test/eisland-update/tauri/latest.json").unwrap();
    assert_eq!(
        sources::download_url(None, &feed, &origin)
            .unwrap()
            .as_str(),
        "https://cdn.test/eisland-update/tauri/eIsland_99.0.0_x64-setup.exe"
    );
    for source in ["github", "tencent-cos", "aliyun-oss", "cloudflare-r2"] {
        assert_eq!(
            sources::download_url(Some(&json!(source)), &feed, &origin).unwrap(),
            origin
        );
    }
    for invalid in [
        "https://origin.test/file.zip",
        "https://origin.test/%2F-setup.exe",
        "https://origin.test/",
    ] {
        assert!(
            sources::download_url(None, &feed, &reqwest::Url::parse(invalid).unwrap()).is_err()
        );
    }
}
