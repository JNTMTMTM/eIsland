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

//! Download and install registered native helper extensions without executing JavaScript.
use crate::{state::Desktop, windows::Result};
use futures_util::StreamExt;
use serde_json::{json, Value};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    sync::LazyLock,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
const R2: &str = "https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev";
const ESA: &str = "https://eisland-server-download-cdn.pyisland.com/eisland-update";
const ARCHIVE_LIMIT: u64 = 256 * 1024 * 1024;
const EXTRACT_LIMIT: u64 = 512 * 1024 * 1024;
static MUTATION: LazyLock<tokio::sync::Mutex<()>> = LazyLock::new(|| tokio::sync::Mutex::new(()));
struct Extension {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    executable: &'static str,
}
const REGISTRY: [Extension; 3] = [
    Extension {
        id: "volume-analyzer",
        name: "音频节拍分析器",
        description: "进程级音频频谱分析、振幅检测与 BPM 识别，用于跑马灯节拍特效",
        executable: "eIslandVolumeAnalyzer.exe",
    },
    Extension {
        id: "volume-helper",
        name: "音量控制助手",
        description: "Windows 默认播放设备音量查询、控制与监听（Core Audio COM）",
        executable: "eIslandVolumeHelper.exe",
    },
    Extension {
        id: "brightness-helper",
        name: "亮度控制助手",
        description: "Windows 屏幕亮度查询与控制（WMI / DDC/CI），支持亮度事件监听",
        executable: "eIslandBrightnessReader.exe",
    },
];
#[derive(Default)]
struct Remote {
    id: String,
    version: String,
    url: String,
}
fn metadata(raw: &str) -> Vec<Remote> {
    let mut result = vec![];
    let mut current = Remote::default();
    for line in raw.lines().map(str::trim) {
        if let Some(id) = line.strip_prefix("- id:") {
            if !current.id.is_empty() && !current.version.is_empty() && !current.url.is_empty() {
                result.push(current);
            }
            current = Remote {
                id: id.trim().trim_matches(['\'', '"']).to_owned(),
                ..Default::default()
            };
        } else if let Some(value) = line.strip_prefix("version:") {
            current.version = value.trim().trim_matches(['\'', '"']).to_owned();
        } else if let Some(value) = line.strip_prefix("url:") {
            current.url = value.trim().trim_matches(['\'', '"']).to_owned();
        }
    }
    if !current.id.is_empty() && !current.version.is_empty() && !current.url.is_empty() {
        result.push(current);
    }
    result
}
fn registry(id: &str) -> Result<&'static Extension> {
    REGISTRY
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| "Unknown extension".into())
}
fn root(app: &AppHandle) -> Result<PathBuf> {
    app.state::<Desktop>()
        .store
        .lock()
        .unwrap()
        .directory
        .parent()
        .map(|path| path.join("extensions"))
        .ok_or("Missing extension directory".into())
}
fn base_url(app: &AppHandle, source: &str, resolved: &str) -> Result<String> {
    let value = match source {
        "github" => format!(
            "https://github.com/JNTMTMTM/eIsland/releases/download/v{}",
            app.package_info().version
        ),
        "tencent-cos" | "aliyun-oss" if !resolved.is_empty() => {
            resolved.trim_end_matches('/').to_owned()
        }
        "esa-cdn" => ESA.to_owned(),
        _ => R2.to_owned(),
    };
    let url = reqwest::Url::parse(&value).map_err(|e| e.to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Extension source must use HTTP or HTTPS".into());
    }
    Ok(value)
}
async fn remote(client: &reqwest::Client, base: &str) -> Result<Vec<Remote>> {
    let response = client
        .get(format!("{base}/extensions/latest_ext.yml"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    if response
        .content_length()
        .is_some_and(|bytes| bytes > 1024 * 1024)
    {
        return Err("Extension index exceeds limit".into());
    }
    let content = response.text().await.map_err(|e| e.to_string())?;
    if content.len() > 1024 * 1024 {
        return Err("Extension index exceeds limit".into());
    }
    Ok(metadata(&content))
}
fn valid_version(version: &str) -> bool {
    !version.is_empty()
        && version.len() < 100
        && version
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b".-_+".contains(&b))
}
fn status(app: &AppHandle, remote: &[Remote]) -> Result<Value> {
    let root = root(app)?;
    Ok(json!(REGISTRY.iter().map(|extension|{
  let directory=root.join(extension.id);
  let installed=directory.join(extension.executable).is_file();
  let version=fs::read_to_string(directory.join(".version")).ok().map(|v|v.trim().to_owned());
  let remote=remote.iter().find(|value|value.id==extension.id).map(|value|value.version.clone()).unwrap_or_else(||app.package_info().version.to_string());
  json!({"id":extension.id,"name":extension.name,"description":extension.description,"availableVersion":remote,"installedVersion":if installed{version}else{None},"isInstalled":installed,"requiredRestart":true})
 }).collect::<Vec<_>>()))
}
fn safe_remove(root: &Path, target: &Path) -> Result<()> {
    if target.parent() != Some(root) {
        return Err("Extension mutation outside install directory".into());
    }
    if !target.exists() {
        return Ok(());
    }
    let canonical_root = root.canonicalize().map_err(|e| e.to_string())?;
    let canonical = target.canonicalize().map_err(|e| e.to_string())?;
    if canonical.parent() != Some(canonical_root.as_path()) {
        return Err("Extension directory must not redirect outside its install root".into());
    }
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}
fn extract(archive: &Path, directory: &Path, extension: &Extension) -> Result<()> {
    let input = File::open(archive).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(input).map_err(|e| e.to_string())?;
    if zip.len() > 4096 {
        return Err("Extension archive has too many entries".into());
    }
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let mut total = 0u64;
    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(|e| e.to_string())?;
        let relative = entry
            .enclosed_name()
            .ok_or("Extension archive path escapes its install directory")?;
        if entry.name().contains('\\')
            || relative
                .components()
                .any(|component| !matches!(component, Component::Normal(_) | Component::CurDir))
            || entry
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Invalid extension archive entry".into());
        }
        total = total
            .checked_add(entry.size())
            .ok_or("Extension archive exceeds limit")?;
        if total > EXTRACT_LIMIT {
            return Err("Extension archive exceeds limit".into());
        }
        let output = directory.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&output).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut file = File::create(output).map_err(|e| e.to_string())?;
        let copied = std::io::copy(&mut entry.by_ref().take(EXTRACT_LIMIT + 1), &mut file)
            .map_err(|e| e.to_string())?;
        if copied > EXTRACT_LIMIT {
            return Err("Extension archive exceeds limit".into());
        }
    }
    if !directory.join(extension.executable).is_file() {
        return Err("Extension archive does not contain its native executable".into());
    }
    Ok(())
}
async fn install(app: &AppHandle, id: &str, base: &str) -> Result<()> {
    let extension = registry(id)?;
    let _guard = MUTATION.lock().await;
    let root = root(app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;
    let versions = remote(&client, base).await.unwrap_or_default();
    let version = versions
        .iter()
        .find(|value| value.id == id)
        .map(|value| value.version.clone())
        .unwrap_or_else(|| app.package_info().version.to_string());
    if !valid_version(&version) {
        return Err("Invalid extension version".into());
    }
    let url = format!("{base}/extensions/{id}-v{version}.zip");
    let suffix = format!("{}-{:016x}", std::process::id(), rand::random::<u64>());
    let archive = root.join(format!(".{id}-{suffix}.zip"));
    let staging = root.join(format!(".{id}-{suffix}.stage"));
    let backup = root.join(format!(".{id}-{suffix}.backup"));
    let destination = root.join(id);
    let result=async {
  let response=client.get(url).send().await.map_err(|e|e.to_string())?.error_for_status().map_err(|e|e.to_string())?;
  let total=response.content_length().unwrap_or(0);if total>ARCHIVE_LIMIT{return Err("Extension download exceeds limit".into());}
  let mut stream=response.bytes_stream();let mut file=File::create(&archive).map_err(|e|e.to_string())?;let mut transferred=0u64;let mut last_progress=None;
  while let Some(chunk)=stream.next().await {
   let chunk=chunk.map_err(|e|e.to_string())?;transferred+=chunk.len()as u64;if transferred>ARCHIVE_LIMIT{return Err("Extension download exceeds limit".into());}
   file.write_all(&chunk).map_err(|e|e.to_string())?;
   let progress=(transferred*100).checked_div(total).unwrap_or(0).min(100);
   if last_progress!=Some(progress){let _=app.emit("eisland-ipc",json!({"channel":"extension:install-progress","args":[{"id":id,"progress":progress,"transferred":transferred,"total":total}]}));last_progress=Some(progress);}
  }
  file.sync_all().map_err(|e|e.to_string())?;drop(file);
  let archive_path=archive.clone();let staging_path=staging.clone();
  tauri::async_runtime::spawn_blocking(move||extract(&archive_path,&staging_path,extension)).await.map_err(|e|e.to_string())??;
  fs::write(staging.join(".version"),&version).map_err(|e|e.to_string())?;
  if destination.exists(){
   // Check canonical containment before moving or removing an existing install.
   if destination.canonicalize().map_err(|e|e.to_string())?.parent()!=Some(root.canonicalize().map_err(|e|e.to_string())?.as_path()){return Err("Extension install redirects outside its root".into());}
   fs::rename(&destination,&backup).map_err(|e|e.to_string())?;
  }
  if let Err(error)=fs::rename(&staging,&destination){if backup.exists(){let _=fs::rename(&backup,&destination);}return Err(error.to_string());}
  safe_remove(&root,&backup)?;
  let _=app.emit("eisland-ipc",json!({"channel":"extension:install-progress","args":[{"id":id,"progress":100,"transferred":transferred,"total":total}]}));
  Ok(())
 }.await;
    let _ = safe_remove(&root, &archive);
    let _ = safe_remove(&root, &staging);
    result
}
/// Find an installed native helper while retaining the build-time plugin fallback.
pub fn native_helper(app: &AppHandle, component: &str, file: &str) -> Option<PathBuf> {
    let id = match component {
        "volume" => "volume-helper",
        "brightness" => "brightness-helper",
        "volume-analyzer" => "volume-analyzer",
        _ => return None,
    };
    let extension = registry(id).ok()?;
    if file != extension.executable {
        return None;
    }
    let path = root(app).ok()?.join(id).join(file);
    path.is_file().then_some(path)
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "extension:list" | "extension:install" | "extension:uninstall"
    )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let id = args.first().and_then(Value::as_str).unwrap_or("");
    if channel == "extension:list" {
        let source = id;
        let resolved = args.get(1).and_then(Value::as_str).unwrap_or("");
        let versions = if source.is_empty() {
            vec![]
        } else {
            let base = base_url(app, source, resolved)?;
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .map_err(|e| e.to_string())?;
            remote(&client, &base).await.unwrap_or_default()
        };
        return status(app, &versions);
    }
    let result = if channel == "extension:install" {
        let source = args
            .get(1)
            .and_then(Value::as_str)
            .unwrap_or("cloudflare-r2");
        let resolved = args.get(2).and_then(Value::as_str).unwrap_or("");
        match base_url(app, source, resolved) {
            Ok(base) => install(app, id, &base).await,
            Err(error) => Err(error),
        }
    } else {
        let _guard = MUTATION.lock().await;
        match registry(id) {
            Ok(extension) => {
                let root = root(app)?;
                safe_remove(&root, &root.join(extension.id))
            }
            Err(error) => Err(error),
        }
    };
    Ok(match result {
        Ok(()) => json!({"success":true}),
        Err(error) => json!({"success":false,"error":error}),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parses_remote_native_versions() {
        let result=metadata("extensions:\n - id: volume-helper\n version: 1.2.3\n url: volume-helper-v1.2.3.zip\n size: 42\n");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "1.2.3");
    }
    #[test]
    fn rejects_unregistered_extensions_and_invalid_versions() {
        assert!(registry("../escape").is_err());
        assert!(!valid_version("../../escape"));
        assert!(valid_version("27.0.1-beta.1"));
    }
    #[test]
    fn native_registry_does_not_require_javascript() {
        assert!(REGISTRY
            .iter()
            .all(|entry| entry.executable.ends_with(".exe")));
    }
    #[test]
    fn archive_extraction_requires_native_executable_and_blocks_traversal() {
        use zip::{write::SimpleFileOptions, ZipWriter};
        let root = std::env::temp_dir().join(format!(
            "eisland-native-extension-test-{:016x}",
            rand::random::<u64>()
        ));
        fs::create_dir(&root).unwrap();
        let archive = root.join("native.zip");
        let mut zip = ZipWriter::new(File::create(&archive).unwrap());
        zip.start_file(REGISTRY[1].executable, SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"fixture-only").unwrap();
        zip.finish().unwrap();
        let directory = root.join("native");
        extract(&archive, &directory, &REGISTRY[1]).unwrap();
        assert!(directory.join(REGISTRY[1].executable).is_file());
        assert!(!directory.join("index.js").exists());
        let mut zip = ZipWriter::new(File::create(&archive).unwrap());
        zip.start_file("../outside", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"outside").unwrap();
        zip.finish().unwrap();
        assert!(extract(&archive, &root.join("bad"), &REGISTRY[1]).is_err());
        assert!(!root.parent().unwrap().join("outside").exists());
        assert!(safe_remove(&root, &root.parent().unwrap().join("outside")).is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
