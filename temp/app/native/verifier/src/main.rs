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

//! 与 Tauri 官方更新器共享成熟 Minisign 验证库，拒绝篡改、错误密钥和版本重放。
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Deserialize;
use std::io::Read;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    file: String,
    public_key: String,
    signature: String,
    version: String,
}

fn verify(request: &Request) -> Result<(), Box<dyn std::error::Error>> {
    let key_text = String::from_utf8(STANDARD.decode(request.public_key.trim())?)?;
    let signature_text = String::from_utf8(STANDARD.decode(request.signature.trim())?)?;
    let key = minisign_verify::PublicKey::decode(&key_text)?;
    let signature = minisign_verify::Signature::decode(&signature_text)?;
    let mut verifier = key.verify_stream(&signature)?;
    let mut file = std::fs::File::open(&request.file)?;
    if file.metadata()?.len() > 2 * 1024 * 1024 * 1024 {
        return Err("installer size exceeds limit".into());
    }
    let mut buffer = [0u8; 65536];
    loop {
        let length = file.read(&mut buffer)?;
        if length == 0 {
            break;
        }
        verifier.update(&buffer[..length]);
    }
    verifier.finalize()?;
    let version = signature
        .trusted_comment()
        .split('\t')
        .find_map(|item| item.strip_prefix("version:"))
        .map(str::to_owned);
    if version.as_deref() != Some(request.version.as_str()) {
        return Err("signed version does not match manifest".into());
    }
    Ok(())
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let arguments = std::env::args_os().skip(1).collect::<Vec<_>>();
    if arguments.len() != 1 {
        return Err("expected verification request file".into());
    }
    let file = std::fs::File::open(&arguments[0])?;
    if file.metadata()?.len() > 65536 {
        return Err("verification request exceeds limit".into());
    }
    let request: Request = serde_json::from_reader(file)?;
    verify(&request)
}

fn main() {
    if run().is_err() {
        // 不向日志输出请求内容、密钥或文件数据。
        eprintln!("Update signature or signed version rejected");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Write};
    use std::sync::atomic::{AtomicUsize, Ordering};
    static NEXT: AtomicUsize = AtomicUsize::new(0);

    struct Fixture(std::path::PathBuf);
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn fixture() -> (Fixture, Request) {
        let directory = std::env::temp_dir().join(format!(
            "eisland-adapter-signature-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&directory).unwrap();
        let bytes = b"MZ isolated signature fixture, never an installer";
        let file = directory.join("fixture.exe");
        std::fs::File::create(&file)
            .unwrap()
            .write_all(bytes)
            .unwrap();
        // 私钥仅在内存中生成并使用，不序列化或落盘。
        let pair = minisign::KeyPair::generate_unencrypted_keypair().unwrap();
        let signature = minisign::sign(
            None,
            &pair.sk,
            Cursor::new(bytes),
            Some("timestamp:1\tfile:fixture.exe\tversion:27.0.3"),
            None,
        )
        .unwrap();
        let request = Request {
            file: file.to_str().unwrap().into(),
            public_key: STANDARD.encode(pair.pk.to_box().unwrap().to_string()),
            signature: STANDARD.encode(signature.to_string()),
            version: "27.0.3".into(),
        };
        (Fixture(directory), request)
    }

    #[test]
    fn accepts_authentic_payload_and_version() {
        let (_fixture, request) = fixture();
        verify(&request).unwrap();
    }

    #[test]
    fn rejects_tampered_file_and_wrong_key() {
        let (_fixture, mut request) = fixture();
        let (_other, wrong) = fixture();
        let key = request.public_key.clone();
        request.public_key = wrong.public_key;
        assert!(verify(&request).is_err());
        request.public_key = key;
        std::fs::write(&request.file, b"MZ tampered").unwrap();
        assert!(verify(&request).is_err());
    }

    #[test]
    fn rejects_version_replay_and_comment_tampering() {
        let (_fixture, mut request) = fixture();
        request.version = "27.0.4".into();
        assert!(verify(&request).is_err());
        request.version = "27.0.3".into();
        let text = String::from_utf8(STANDARD.decode(&request.signature).unwrap()).unwrap();
        request.signature = STANDARD.encode(text.replace("version:27.0.3", "version:27.0.4"));
        assert!(verify(&request).is_err());
    }

    #[test]
    fn rejects_malformed_key_and_signature() {
        let (_fixture, mut request) = fixture();
        request.signature = STANDARD.encode("truncated");
        assert!(verify(&request).is_err());
        request.public_key = "invalid%%%".into();
        assert!(verify(&request).is_err());
    }
}
