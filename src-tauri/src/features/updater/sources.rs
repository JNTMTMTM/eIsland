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

//! Compatibility for existing source keys and server-issued feed directories.
use crate::shared::Result;
use serde_json::Value;

pub(super) fn secure_url(url: &reqwest::Url) -> Result<()> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err("NATIVE_UPDATE_URL_CREDENTIALS_NOT_ALLOWED".into());
    }
    if url.scheme() == "https" {
        return Ok(());
    }
    #[cfg(debug_assertions)]
    if url.scheme() == "http"
        && matches!(
            url.host_str(),
            Some("localhost" | "127.0.0.1" | "::1" | "[::1]")
        )
    {
        return Ok(());
    }
    Err("NATIVE_UPDATE_REQUIRES_HTTPS".into())
}
/// A CDN mirrors its origin's JSON unchanged; route its signed artifact through that CDN.
pub(super) fn download_url(
    source: Option<&Value>,
    feed: &reqwest::Url,
    declared: &reqwest::Url,
) -> Result<reqwest::Url> {
    if matches!(
        source.and_then(Value::as_str),
        Some("github" | "tencent-cos" | "aliyun-oss" | "cloudflare-r2")
    ) {
        return Ok(declared.clone());
    }
    let name = declared
        .path_segments()
        .and_then(|mut parts| parts.next_back())
        .filter(|name| !name.is_empty() && !name.contains('%') && name.ends_with("-setup.exe"))
        .ok_or("NATIVE_UPDATE_INSTALLER_NAME_INVALID")?;
    let routed = feed.join(name).map_err(|_| "NATIVE_UPDATE_URL_INVALID")?;
    secure_url(&routed)?;
    Ok(routed)
}
pub(super) fn endpoint(source: Option<&Value>, resolved: Option<&Value>) -> Result<reqwest::Url> {
    let raw = match source.and_then(Value::as_str) {
        Some("tencent-cos" | "aliyun-oss") => resolved.and_then(Value::as_str).filter(|value| !value.trim().is_empty()).ok_or("PRO update source requires a server-issued URL")?.to_owned(),
        Some("github") => std::env::var("EISLAND_TAURI_UPDATE_GITHUB_URL").unwrap_or_else(|_| option_env!("EISLAND_TAURI_UPDATE_GITHUB_URL").unwrap_or("https://github.com/JNTMTMTM/eIsland/releases/latest/download/tauri-latest.yml").into()),
        Some("cloudflare-r2") => std::env::var("EISLAND_TAURI_UPDATE_R2_URL").unwrap_or_else(|_| option_env!("EISLAND_TAURI_UPDATE_R2_URL").unwrap_or("https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev/eisland-update/tauri/tauri-latest.yml").into()),
        _ => std::env::var("EISLAND_TAURI_UPDATE_ESA_URL").unwrap_or_else(|_| option_env!("EISLAND_TAURI_UPDATE_ESA_URL").unwrap_or("https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/tauri-latest.yml").into()),
    };
    let mut url = reqwest::Url::parse(&raw).map_err(|_| "NATIVE_UPDATE_URL_INVALID")?;
    if (url.path().ends_with(".yml") || url.path().ends_with(".yaml"))
        && !url.path().ends_with("/tauri-latest.yml")
    {
        return Err("ELECTRON_UPDATE_MANIFEST_REJECTED: configure the native JSON feed".into());
    }
    if !url.path().ends_with(".json") && !url.path().ends_with("/tauri-latest.yml") {
        if url.query().is_some() {
            return Err("NATIVE_UPDATE_SIGNED_DIRECTORY_URL_UNSUPPORTED".into());
        }
        let prefix = url.path().trim_end_matches('/');
        let path = if prefix.ends_with("/eisland-update") {
            format!("{prefix}/tauri/tauri-latest.yml")
        } else if prefix.ends_with("/tauri") {
            format!("{prefix}/tauri-latest.yml")
        } else {
            format!("{prefix}/eisland-update/tauri/tauri-latest.yml")
        };
        url.set_path(&path);
    }
    secure_url(&url)?;
    Ok(url)
}
