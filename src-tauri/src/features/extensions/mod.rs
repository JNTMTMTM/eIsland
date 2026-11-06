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
use crate::shared::Result;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    sync::LazyLock,
    time::Duration,
};
use tauri::{AppHandle, Emitter};
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
#[derive(Default, Debug, Deserialize)]
struct Remote {
    id: String,
    version: String,
    url: String,
}
/// Published indexes use a root sequence; accept the documented object wrapper as well.
#[derive(Deserialize)]
#[serde(untagged)]
enum ExtensionIndex {
    Sequence(Vec<Remote>),
    Wrapped { extensions: Vec<Remote> },
}
fn metadata(raw: &str) -> Result<Vec<Remote>> {
    let parsed: ExtensionIndex = serde_yaml_ng::from_str(raw)
        .map_err(|error| format!("Invalid extension index: {error}"))?;
    let entries = match parsed {
        ExtensionIndex::Sequence(entries)
        | ExtensionIndex::Wrapped {
            extensions: entries,
        } => entries,
    };
    if entries.len() > 4096 {
        return Err("Extension index has too many entries".into());
    }
    Ok(entries
        .into_iter()
        .filter(|entry| !entry.id.is_empty() && !entry.version.is_empty() && !entry.url.is_empty())
        .collect())
}
fn registry(id: &str) -> Result<&'static Extension> {
    REGISTRY
        .iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| "Unknown extension".into())
}
fn root(app: &AppHandle) -> Result<PathBuf> {
    Ok(crate::infrastructure::storage::data_dir(app).join("extensions"))
}
/// Prefer an installed feature extension, then the packaged native helper.
pub(crate) fn resolve_native_helper(
    app: &AppHandle,
    component: &str,
    file: &str,
) -> Result<PathBuf> {
    native_helper(app, component, file)
        .map(Ok)
        .unwrap_or_else(|| crate::infrastructure::resources::native_path(app, component, file))
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
    let mut response = client
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
    let content = crate::infrastructure::http::bounded(&mut response, 1024 * 1024).await?;
    metadata(std::str::from_utf8(&content).map_err(|error| error.to_string())?)
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
    crate::infrastructure::archive::extract(
        archive,
        directory,
        false,
        crate::infrastructure::archive::Limits {
            entries: 4096,
            bytes: EXTRACT_LIMIT,
        },
    )?;
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
    let client = crate::infrastructure::http::stream_client();
    let versions = remote(client, base).await.unwrap_or_default();
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
  let response=client.get(url).timeout(Duration::from_secs(300)).send().await.map_err(|e|e.to_string())?.error_for_status().map_err(|e|e.to_string())?;
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
            let client = crate::infrastructure::http::client();
            remote(client, &base).await.unwrap_or_default()
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
    fn formal_yaml_preserves_published_sequence_wrapper_quotes_and_comments() {
        let sequence = "- id: volume-helper\n  version: '1.2.3' # published comment\n  url: \"中文文件.zip?next=a:b#fragment\"\n  size: 42\n";
        let result = metadata(sequence).unwrap();
        assert_eq!(result[0].id, "volume-helper");
        assert_eq!(result[0].url, "中文文件.zip?next=a:b#fragment");
        let wrapped = format!(
            "extensions:\n{}",
            sequence
                .lines()
                .map(|line| format!("  {line}\n"))
                .collect::<String>()
        );
        assert_eq!(metadata(&wrapped).unwrap()[0].version, "1.2.3");
        assert_eq!(
            metadata(r#"[{"id":"volume-helper","version":"1.2.3","url":"package.zip"}]"#).unwrap()
                [0]
            .url,
            "package.zip"
        );
    }
    #[test]
    fn formal_yaml_rejects_guessed_indentation_wrong_shapes_duplicate_keys_and_truncation() {
        for value in [
            "extensions:\n - id: volume-helper\n version: 1.2.3\n url: file.zip",
            "- id: volume-helper\n  id: brightness-helper\n  version: 1.2.3\n  url: file.zip",
            "- id: [nested]\n  version: 1.2.3\n  url: file.zip",
            "- id: volume-helper\n  url: [",
            "unexpected: []",
        ] {
            assert!(metadata(value).is_err(), "{value}");
        }
        assert!(metadata("[]").unwrap().is_empty());
    }
    #[test]
    fn parses_remote_native_versions() {
        let result = metadata(
            "- id: volume-helper\n  version: 1.2.3\n  url: volume-helper-v1.2.3.zip\n  size: 42\n",
        )
        .unwrap();
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
