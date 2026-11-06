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

//! Offline publisher verification using the updater's existing Minisign library.
use crate::shared::Result;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::io::Read;

fn text(value: &str) -> Result<String> {
    String::from_utf8(
        STANDARD
            .decode(value.trim())
            .map_err(|_| "Invalid updater signature encoding")?,
    )
    .map_err(|_| "Invalid updater signature text".into())
}
/// Verify a streamed installer with a public key; no signing key is read by this command.
pub(super) fn verify_file(
    path: &std::path::Path,
    signature: &str,
    public_key: &str,
) -> Result<String> {
    let key = minisign_verify::PublicKey::decode(&text(public_key)?)
        .map_err(|error| error.to_string())?;
    let signature =
        minisign_verify::Signature::decode(&text(signature)?).map_err(|error| error.to_string())?;
    let mut verifier = key
        .verify_stream(&signature)
        .map_err(|error| error.to_string())?;
    let mut file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    if file.metadata().map_err(|error| error.to_string())?.len() > 2 * 1024 * 1024 * 1024 {
        return Err("Installer exceeds size limit".into());
    }
    let mut buffer = [0u8; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if count == 0 {
            break;
        }
        verifier.update(&buffer[..count]);
    }
    verifier.finalize().map_err(|error| error.to_string())?;
    Ok(signature.trusted_comment().to_owned())
}
pub(super) fn run_cli() -> bool {
    let args = std::env::args_os().skip(1).collect::<Vec<_>>();
    if args
        .first()
        .is_none_or(|arg| arg != "--verify-update-artifact")
    {
        return false;
    }
    let result: Result<()> = (|| {
        if args.len() != 3 {
            return Err("Usage: --verify-update-artifact <installer> <signature>".into());
        }
        let key = option_env!("TAURI_UPDATER_PUBLIC_KEY")
            .filter(|key| !key.trim().is_empty())
            .ok_or("Updater public key was not configured for this build")?;
        let signature = std::fs::read_to_string(&args[2]).map_err(|error| error.to_string())?;
        let comment = verify_file(std::path::Path::new(&args[1]), &signature, key)?;
        if comment
            .split('\t')
            .find_map(|field| field.strip_prefix("version:"))
            != Some(env!("CARGO_PKG_VERSION"))
        {
            return Err("Signed artifact version does not match this release verifier".into());
        }
        Ok(())
    })();
    if let Err(error) = result {
        eprintln!("Update artifact verification failed: {error}");
        std::process::exit(1);
    }
    true
}
