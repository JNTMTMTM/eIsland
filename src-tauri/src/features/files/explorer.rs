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

//! 独立文件管理器的快速访问位置、目录快照和本机文件操作。
use crate::shared::Result;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};

#[cfg(windows)]
mod shell;

fn location_list(app: &AppHandle) -> Value {
    let paths = app.path();
    let mut places = Vec::new();
    for (kind, path) in [
        ("home", paths.home_dir()),
        ("desktop", paths.desktop_dir()),
        ("documents", paths.document_dir()),
        ("downloads", paths.download_dir()),
    ] {
        if let Ok(path) = path {
            places.push(json!({"kind": kind, "path": path}));
        }
    }
    #[cfg(windows)]
    {
        let mask = unsafe { windows_sys::Win32::Storage::FileSystem::GetLogicalDrives() };
        for index in 0..26 {
            if mask & (1 << index) != 0 {
                let path = format!("{}:\\", (b'A' + index) as char);
                places.push(json!({"kind": "drive", "path": path}));
            }
        }
    }
    json!(places)
}

fn absolute(value: &Value) -> Result<PathBuf> {
    let raw = super::text(value)?;
    let path = Path::new(raw);
    if !path.is_absolute() || raw.contains('\0') {
        return Err("invalidPath".into());
    }
    #[cfg(windows)]
    if !matches!(path.components().next(), Some(std::path::Component::Prefix(p))
        if matches!(p.kind(), std::path::Prefix::Disk(_) | std::path::Prefix::UNC(_, _)))
    {
        return Err("invalidPath".into());
    }
    std::path::absolute(path).map_err(|e| e.to_string())
}

fn list(path: &Path) -> Result<Value> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        let meta = entry.metadata().ok();
        #[cfg(windows)]
        let directory = {
            use std::os::windows::fs::MetadataExt;
            meta.as_ref().is_some_and(|m| {
                m.file_attributes()
                    & windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_DIRECTORY
                    != 0
            })
        };
        #[cfg(not(windows))]
        let directory = entry.path().is_dir();
        let modified = meta
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|t| t.as_millis() as u64);
        entries.push(
            json!({"name": name, "path": entry.path(), "directory": directory,
            "size": meta.as_ref().filter(|_| !directory).map(|m| m.len()), "modified": modified}),
        );
    }
    Ok(json!({"path": path, "parent": path.parent(), "entries": entries}))
}

fn child_name(value: &Value) -> Result<&str> {
    let name = value.as_str().unwrap_or("");
    let stem = name
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end()
        .to_ascii_uppercase();
    let device = matches!(
        stem.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
    ) || ["COM", "LPT"].iter().any(|p| {
        stem.strip_prefix(p).is_some_and(|n| {
            matches!(
                n,
                "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
            )
        })
    });
    if name.is_empty()
        || name.ends_with([' ', '.'])
        || device
        || name
            .chars()
            .any(|c| c.is_control() || r#"<>:"/\|?*"#.contains(c))
    {
        return Err("invalidName".into());
    }
    Ok(name)
}

fn work(channel: &str, args: &[Value]) -> Result<Value> {
    let source = absolute(args.first().unwrap_or(&Value::Null))?;
    let arg = args.get(1).unwrap_or(&Value::Null);
    match channel {
        "explorer:list" => list(&source),
        "explorer:create" => {
            fs::create_dir(source.join(child_name(arg)?)).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        #[cfg(windows)]
        "explorer:rename" | "explorer:copy" | "explorer:move" | "explorer:trash" => {
            if source.file_name().is_none() {
                return Err("invalidPath".into());
            }
            shell::operate(channel, &source, arg)?;
            Ok(Value::Null)
        }
        _ => Err("unsupported".into()),
    }
}

pub(crate) async fn handle(app: &AppHandle, channel: &str, args: Vec<Value>) -> Result<Value> {
    if channel == "explorer:locations" {
        return Ok(location_list(app));
    }
    let channel = channel.to_owned();
    tauri::async_runtime::spawn_blocking(move || work(&channel, &args))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_components_and_reserved_windows_names() {
        for name in [
            "",
            "..",
            "../other",
            r"C:\other",
            "a:b",
            "NUL.txt",
            "COM¹.log",
            "end.",
            "end ",
        ] {
            assert_eq!(child_name(&json!(name)), Err("invalidName".into()));
        }
        assert_eq!(
            child_name(&json!("旅行 2026.txt")).unwrap(),
            "旅行 2026.txt"
        );
        assert!(absolute(&json!("relative")).is_err());
        #[cfg(windows)]
        assert!(absolute(&json!(r"\\.\PhysicalDrive0")).is_err());
    }

    #[cfg(windows)]
    #[test]
    fn manages_unicode_entries_and_preserves_both_files_on_rename_collision() {
        let root = std::env::temp_dir().join(format!("eisland-explorer-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&root).unwrap();
        let folder = root.join("资料");
        let original = root.join("original.txt");
        let target = root.join("existing.txt");
        fs::write(&original, b"original").unwrap();
        fs::write(&target, b"existing").unwrap();
        work("explorer:create", &[json!(root), json!("资料")]).unwrap();
        assert!(work("explorer:create", &[json!(root), json!("资料")]).is_err());
        let snapshot = work("explorer:list", &[json!(root)]).unwrap();
        let entries = snapshot["entries"].as_array().unwrap();
        assert_eq!(entries.len(), 3);
        assert!(entries
            .iter()
            .any(|e| e["path"] == json!(folder) && e["directory"] == true));
        assert!(entries
            .iter()
            .any(|e| e["name"] == "original.txt" && e["size"] == 8));
        assert!(work("explorer:rename", &[json!(original), json!("existing.txt")]).is_err());
        assert_eq!(fs::read(&original).unwrap(), b"original");
        assert_eq!(fs::read(&target).unwrap(), b"existing");
        assert_eq!(
            work("explorer:copy", &[json!(root), json!(folder)]),
            Err("insideSource".into())
        );
        work("explorer:copy", &[json!(original), json!(folder)]).unwrap();
        let copy = folder.join("original.txt");
        assert_eq!(fs::read(&copy).unwrap(), b"original");
        work("explorer:rename", &[json!(copy), json!("移动.txt")]).unwrap();
        work(
            "explorer:move",
            &[json!(folder.join("移动.txt")), json!(root)],
        )
        .unwrap();
        assert_eq!(fs::read(root.join("移动.txt")).unwrap(), b"original");
        assert!(!folder.join("移动.txt").exists());
        fs::remove_dir_all(root).unwrap();
    }
}
