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

//! 真实验证器进程协议测试，只执行仓库构建的验证器，不执行任何安装程序。
use base64::{engine::general_purpose::STANDARD, Engine};
use std::io::Cursor;
use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Fixture(std::path::PathBuf);
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn fixture() -> (Fixture, serde_json::Value) {
    let directory = std::env::temp_dir().join(format!(
        "eisland-adapter-cli-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    std::fs::create_dir(&directory).unwrap();
    let file = directory.join("隔离测试.exe");
    let bytes = "MZ 本地签名测试，不是可执行安装器".as_bytes();
    std::fs::write(&file, bytes).unwrap();
    // 私钥只在内存中短暂使用，测试请求仅存储公开密钥和签名。
    let pair = minisign::KeyPair::generate_unencrypted_keypair().unwrap();
    let signature = minisign::sign(
        None,
        &pair.sk,
        Cursor::new(bytes),
        Some("timestamp:1\tfile:fixture.exe\tversion:27.0.3"),
        None,
    )
    .unwrap();
    let request = serde_json::json!({ "file": file, "publicKey": STANDARD.encode(pair.pk.to_box().unwrap().to_string()), "signature": STANDARD.encode(signature.to_string()), "version": "27.0.3" });
    (Fixture(directory), request)
}

fn execute(directory: &std::path::Path, request: &serde_json::Value) -> std::process::Output {
    let file = directory.join("request.json");
    std::fs::write(&file, serde_json::to_vec(request).unwrap()).unwrap();
    Command::new(env!("CARGO_BIN_EXE_eisland-update-verifier"))
        .arg(file)
        .output()
        .unwrap()
}

#[test]
fn authentic_json_request_passes_real_process_boundary() {
    let (fixture, request) = fixture();
    let result = execute(&fixture.0, &request);
    assert!(result.status.success());
    assert!(result.stdout.is_empty());
    assert!(result.stderr.is_empty());
}

#[test]
fn replay_malformed_unknown_fields_and_missing_payload_fail() {
    let (fixture, mut request) = fixture();
    request["version"] = "27.0.4".into();
    let result = execute(&fixture.0, &request);
    assert!(!result.status.success());
    assert_eq!(
        String::from_utf8_lossy(&result.stderr).trim(),
        "Update signature or signed version rejected"
    );
    request["unexpected"] = true.into();
    assert!(!execute(&fixture.0, &request).status.success());
    request.as_object_mut().unwrap().remove("unexpected");
    request["file"] = fixture
        .0
        .join("missing.exe")
        .to_string_lossy()
        .as_ref()
        .into();
    assert!(!execute(&fixture.0, &request).status.success());
    let file = fixture.0.join("request.json");
    std::fs::write(&file, "invalid JSON").unwrap();
    assert!(!Command::new(env!("CARGO_BIN_EXE_eisland-update-verifier"))
        .arg(file)
        .output()
        .unwrap()
        .status
        .success());
}

#[test]
fn oversized_request_and_wrong_argument_count_fail_closed() {
    let (fixture, _request) = fixture();
    let file = fixture.0.join("oversized.json");
    std::fs::write(&file, vec![b' '; 65537]).unwrap();
    assert!(!Command::new(env!("CARGO_BIN_EXE_eisland-update-verifier"))
        .arg(&file)
        .output()
        .unwrap()
        .status
        .success());
    assert!(!Command::new(env!("CARGO_BIN_EXE_eisland-update-verifier"))
        .output()
        .unwrap()
        .status
        .success());
    assert!(!Command::new(env!("CARGO_BIN_EXE_eisland-update-verifier"))
        .arg(&file)
        .arg(&file)
        .output()
        .unwrap()
        .status
        .success());
}
