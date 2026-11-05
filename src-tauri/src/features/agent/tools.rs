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

use super::{failure, now, save, store, system_tools};
use crate::shared::Result;
use crate::state::Desktop;
use serde_json::{json, Value};
use std::{
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    process::Stdio,
    time::{Duration, Instant, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{io::AsyncReadExt, process::Command};

fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value[key].as_str().unwrap_or("").trim()
}
fn number(value: &Value, key: &str, fallback: u64, min: u64, max: u64) -> u64 {
    value[key].as_u64().unwrap_or(fallback).clamp(min, max)
}
fn normalized(path: &Path) -> Result<PathBuf> {
    let absolute = if path.is_absolute() {
        path.to_owned()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(path)
    };
    let mut normalized = PathBuf::new();
    for component in absolute.components() {
        match component {
            Component::ParentDir => {
                normalized.pop();
            }
            Component::CurDir => {}
            other => normalized.push(other.as_os_str()),
        }
    }
    let mut ancestor = normalized.clone();
    let mut missing = Vec::new();
    while !ancestor.exists() {
        let name = ancestor
            .file_name()
            .ok_or("Path has no existing parent")?
            .to_owned();
        missing.push(name);
        ancestor.pop();
    }
    let mut result = ancestor.canonicalize().map_err(|e| e.to_string())?;
    for name in missing.into_iter().rev() {
        result.push(name);
    }
    Ok(result)
}
pub fn checked_path(raw: &str, workspaces: &Value) -> Result<PathBuf> {
    if raw.is_empty() {
        return Err("A file path is required".into());
    }
    let target = normalized(Path::new(raw))?;
    let roots = workspaces
        .as_array()
        .ok_or("No Agent workspace configured")?;
    let allowed = roots
        .iter()
        .filter_map(Value::as_str)
        .filter(|s| !s.trim().is_empty())
        .filter_map(|root| normalized(Path::new(root)).ok())
        .any(|root| {
            if cfg!(windows) {
                let root = root.to_string_lossy().to_lowercase();
                let target = target.to_string_lossy().to_lowercase();
                target == root || target.starts_with(&(root + "\\"))
            } else {
                target.starts_with(root)
            }
        });
    if !allowed {
        return Err(format!(
            "Path outside Agent workspaces: {}",
            target.display()
        ));
    }
    Ok(target)
}
pub async fn execute(app: &AppHandle, request: &Value) -> Value {
    let started = Instant::now();
    let tool = text(request, "tool").to_lowercase();
    let mut args = request["arguments"].clone();
    let workspaces = request["workspaces"].clone();
    let result = async {
        if tool == "win.screenshot" {
            let raw = if text(&args, "savePath").is_empty() {
                text(&args, "path")
            } else {
                text(&args, "savePath")
            };
            args["savePath"] = json!(checked_path(raw, &workspaces)?);
        }
        if tool == "defender.scan" && !text(&args, "path").is_empty() {
            args["path"] = json!(checked_path(text(&args, "path"), &workspaces)?);
        }
        if let Some(value) = system_tools::execute(app, &tool, &args).await {
            return value;
        }
        if matches!(tool.as_str(), "cmd.exec" | "cmd.powershell") {
            let command = text(&args, "command");
            if command.is_empty() {
                return Err("Command is required".into());
            }
            let cwd = if text(&args, "cwd").is_empty() {
                None
            } else {
                Some(checked_path(text(&args, "cwd"), &workspaces)?)
            };
            return command_output(
                &tool,
                command,
                cwd.as_deref(),
                number(&args, "timeoutMs", 20000, 1000, 60000),
            )
            .await;
        }
        if tool.starts_with("island.")
            || tool.starts_with("alarm.")
            || tool.starts_with("todolist.")
        {
            return settings(app, &tool, &args);
        }
        if tool.starts_with("file.") {
            let app = app.clone();
            let tool = tool.clone();
            let args = args.clone();
            return tauri::async_runtime::spawn_blocking(move || {
                files(&app, &tool, &args, &workspaces)
            })
            .await
            .map_err(|e| e.to_string())?;
        }
        Err(format!("Unsupported local tool: {tool}"))
    }
    .await;
    match result {
        Ok(result) => {
            json!({"success":true,"result":result,"error":"","durationMs":started.elapsed().as_millis()})
        }
        Err(error) => failure(&error, started.elapsed().as_millis()),
    }
}
async fn command_output(
    tool: &str,
    source: &str,
    cwd: Option<&Path>,
    timeout: u64,
) -> Result<Value> {
    let mut command = if tool == "cmd.exec" {
        let mut cmd = Command::new("cmd.exe");
        cmd.args(["/d", "/s", "/c", source]);
        cmd
    } else {
        let mut cmd = Command::new("powershell.exe");
        cmd.args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            source,
        ]);
        cmd
    };
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let out = child
        .stdout
        .take()
        .ok_or("Command stdout unavailable")?
        .take(1024 * 1024 + 1);
    let err = child
        .stderr
        .take()
        .ok_or("Command stderr unavailable")?
        .take(1024 * 1024 + 1);
    let task = async {
        let (stdout, stderr) = tokio::try_join!(read_output(out), read_output(err))?;
        let status = child.wait().await.map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!(
                "Command exited with {}: {}",
                status,
                String::from_utf8_lossy(&stderr)
            ));
        }
        Ok(
            json!({"command":source,"cwd":cwd.map(|p|p.to_string_lossy()).unwrap_or_default(),"stdout":String::from_utf8_lossy(&stdout),"stderr":String::from_utf8_lossy(&stderr)}),
        )
    };
    let result = tokio::time::timeout(Duration::from_millis(timeout), task)
        .await
        .map_err(|_| "Command timed out".to_owned());
    if !matches!(&result, Ok(Ok(_))) {
        let _ = child.kill().await;
    }
    result?
}
async fn read_output(reader: impl tokio::io::AsyncRead + Unpin) -> Result<Vec<u8>> {
    let mut bytes = Vec::new();
    reader
        .take(1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .await
        .map_err(|e| e.to_string())?;
    if bytes.len() > 1024 * 1024 {
        return Err("Command output exceeds 1 MiB".into());
    }
    Ok(bytes)
}
fn read_text(path: &Path, limit: u64) -> Result<String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    if file.metadata().map_err(|e| e.to_string())?.len() > limit {
        return Err("File exceeds size limit".into());
    }
    let mut content = String::new();
    file.take(limit + 1)
        .read_to_string(&mut content)
        .map_err(|e| e.to_string())?;
    if content.len() as u64 > limit {
        return Err("File exceeds size limit".into());
    }
    Ok(content)
}
fn parent(path: &Path) -> Result<()> {
    fs::create_dir_all(path.parent().ok_or("Missing parent directory")?).map_err(|e| e.to_string())
}
fn files(_app: &AppHandle, tool: &str, args: &Value, workspaces: &Value) -> Result<Value> {
    let raw = if tool == "file.rename" {
        text(args, "oldPath")
    } else if tool == "file.copy" {
        text(args, "source")
    } else {
        text(args, "path")
    };
    let source = checked_path(
        if raw.is_empty() {
            text(args, "path")
        } else {
            raw
        },
        workspaces,
    )?;
    match tool {
        "file.list" => {
            let limit = number(args, "limit", 200, 1, 500) as usize;
            let items=fs::read_dir(&source).map_err(|e|e.to_string())?.take(limit).filter_map(|entry|entry.ok()).map(|entry|json!({"name":entry.file_name().to_string_lossy(),"path":entry.path(),"isDirectory":entry.file_type().is_ok_and(|f|f.is_dir())})).collect::<Vec<_>>();
            Ok(json!({"path":source,"count":items.len(),"items":items}))
        }
        "file.exists" => {
            let meta = fs::metadata(&source).ok();
            Ok(
                json!({"path":source,"exists":meta.is_some(),"isFile":meta.as_ref().is_some_and(|v|v.is_file()),"isDirectory":meta.as_ref().is_some_and(|v|v.is_dir())}),
            )
        }
        "file.stat" => {
            let meta = fs::metadata(&source).map_err(|e| e.to_string())?;
            let timestamp = |v: std::io::Result<std::time::SystemTime>| {
                v.ok()
                    .and_then(|v| v.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis())
            };
            let mode = (if meta.is_dir() { 0o040000 } else { 0o100000 })
                | if meta.permissions().readonly() {
                    0o444
                } else {
                    0o666
                };
            Ok(
                json!({"path":source,"exists":true,"isFile":meta.is_file(),"isDirectory":meta.is_dir(),"size":meta.len(),"mode":mode,"atimeMs":timestamp(meta.accessed()),"mtimeMs":timestamp(meta.modified()),"ctimeMs":timestamp(meta.created()),"birthtimeMs":timestamp(meta.created())}),
            )
        }
        "file.mkdir" => {
            let recursive = args["recursive"] != false;
            if recursive {
                fs::create_dir_all(&source)
            } else {
                fs::create_dir(&source)
            }
            .map_err(|e| e.to_string())?;
            Ok(json!({"path":source,"recursive":recursive,"created":true}))
        }
        "file.read" => {
            let content = read_text(&source, 1024 * 1024)?;
            Ok(json!({"path":source,"size":content.len(),"content":content}))
        }
        "file.read.lines" => {
            let content = read_text(&source, 1024 * 1024)?.replace("\r\n", "\n");
            let lines = content.split('\n').collect::<Vec<_>>();
            let start = number(args, "startLine", 1, 1, u64::MAX) as usize;
            let end = number(
                args,
                "endLine",
                start as u64 + 199,
                start as u64,
                start as u64 + 1999,
            ) as usize;
            let selected = lines
                .iter()
                .enumerate()
                .skip(start - 1)
                .take(end - start + 1)
                .map(|(index, line)| json!({"line":index+1,"text":line}))
                .collect::<Vec<_>>();
            Ok(
                json!({"path":source,"startLine":start,"endLine":end,"totalLines":lines.len(),"count":selected.len(),"lines":selected}),
            )
        }
        "file.write" | "file.append" => {
            let content = args["content"]
                .as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| {
                    if args["content"].is_null() {
                        String::new()
                    } else {
                        args["content"].to_string()
                    }
                });
            parent(&source)?;
            if tool == "file.append" {
                fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&source)
                    .and_then(|mut f| f.write_all(content.as_bytes()))
                    .map_err(|e| e.to_string())?;
                Ok(json!({"path":source,"appendedBytes":content.len()}))
            } else {
                fs::write(&source, &content).map_err(|e| e.to_string())?;
                Ok(json!({"path":source,"writtenBytes":content.len()}))
            }
        }
        "file.delete" => {
            if source.is_dir() {
                fs::remove_dir_all(&source)
            } else {
                fs::remove_file(&source)
            }
            .map_err(|e| e.to_string())?;
            Ok(json!({"path":source,"deleted":true}))
        }
        "file.rename" | "file.copy" => {
            let raw = if tool == "file.rename" {
                text(args, "newPath")
            } else {
                text(args, "destination")
            };
            let raw = if raw.is_empty() {
                if tool == "file.rename" {
                    text(args, "destination")
                } else {
                    text(args, "newPath")
                }
            } else {
                raw
            };
            let target = checked_path(raw, workspaces)?;
            parent(&target)?;
            if tool == "file.rename" {
                fs::rename(&source, &target).map_err(|e| e.to_string())?;
                Ok(json!({"oldPath":source,"newPath":target,"renamed":true}))
            } else {
                copy(&source, &target, workspaces)?;
                Ok(
                    json!({"source":source,"destination":target,"isDirectory":source.is_dir(),"copied":true}),
                )
            }
        }
        "file.replace" => {
            let search = text(args, "search");
            if search.is_empty() {
                return Err("Search text is required".into());
            }
            let replacement = args["replacement"].as_str().unwrap_or("");
            let content = read_text(&source, 1024 * 1024)?;
            let all = args["replaceAll"] != false;
            let count = if all {
                content.matches(search).count()
            } else {
                usize::from(content.contains(search))
            };
            if count > 0 {
                let next = if all {
                    content.replace(search, replacement)
                } else {
                    content.replacen(search, replacement, 1)
                };
                fs::write(&source, next).map_err(|e| e.to_string())?;
            }
            Ok(
                json!({"path":source,"search":search,"replacementLength":replacement.chars().count(),"replaceAll":all,"matchCount":count,"modified":count>0}),
            )
        }
        "file.search" | "file.grep" => search(&source, tool, args, workspaces),
        "file.tree" => {
            let max = number(args, "limit", 200, 1, 500) as usize;
            let depth = number(args, "maxDepth", 3, 1, 6) as usize;
            let mut count = 0;
            let tree = tree(&source, depth, max, &mut count, workspaces)?;
            Ok(json!({"path":source,"maxDepth":depth,"itemCount":count,"tree":tree}))
        }
        "file.hash" | "file.trash" | "file.compress" | "file.extract" => {
            archive_or_hash(tool, args, &source, workspaces)
        }
        _ => Err(format!("Unsupported file tool: {tool}")),
    }
}
fn copy(source: &Path, target: &Path, workspaces: &Value) -> Result<()> {
    let checked_target = checked_path(&target.to_string_lossy(), workspaces)?;
    let target = checked_target.as_path();
    if target.starts_with(source) && source.is_dir() {
        return Err("Copy destination cannot be inside source".into());
    }
    if source.is_dir() {
        fs::create_dir_all(target).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = checked_path(&entry.path().to_string_lossy(), workspaces)?;
            copy(&path, &target.join(entry.file_name()), workspaces)?;
        }
    } else {
        fs::copy(source, target).map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn excluded(name: &str, args: &Value) -> bool {
    [
        ".git",
        "node_modules",
        ".idea",
        ".vscode",
        "__pycache__",
        ".next",
        "dist",
        "out",
        "build",
    ]
    .contains(&name)
        || args["excludeDirs"].as_array().is_some_and(|items| {
            items
                .iter()
                .any(|v| v.as_str().is_some_and(|s| s.eq_ignore_ascii_case(name)))
        })
}
fn search(source: &Path, tool: &str, args: &Value, workspaces: &Value) -> Result<Value> {
    let grep = tool == "file.grep";
    let keyword = text(args, if grep { "pattern" } else { "keyword" });
    if keyword.is_empty() {
        return Err("Search pattern is required".into());
    }
    let limit = number(args, "limit", 50, 1, 200) as usize;
    let depth = number(args, "maxDepth", 8, 0, 12) as usize;
    let case = args["caseSensitive"] == true;
    let pattern = if args["fixedStrings"] == true {
        regex::escape(keyword)
    } else {
        keyword.to_owned()
    };
    let regex = if grep {
        Some(
            regex::RegexBuilder::new(&pattern)
                .case_insensitive(!case)
                .build()
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };
    let mut results = Vec::new();
    let walker = walkdir::WalkDir::new(source)
        .max_depth(depth + 1)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            entry.depth() == 0
                || !entry.file_type().is_dir()
                || !excluded(&entry.file_name().to_string_lossy().to_lowercase(), args)
        });
    for entry in walker.filter_map(|v| v.ok()).take(20000) {
        if results.len() >= limit {
            break;
        }
        if entry.depth() == 0 && !entry.file_type().is_file() {
            continue;
        }
        let path = checked_path(&entry.path().to_string_lossy(), workspaces)?;
        let name = entry.file_name().to_string_lossy();
        if !grep && args["includeHidden"] != true && name.starts_with('.') {
            continue;
        }
        if !entry.file_type().is_dir()
            && args["extensions"].as_array().is_some_and(|extensions| {
                !extensions.is_empty()
                    && !extensions.iter().filter_map(Value::as_str).any(|ext| {
                        path.extension().is_some_and(|v| {
                            v.to_string_lossy()
                                .eq_ignore_ascii_case(ext.trim_start_matches('.'))
                        })
                    })
            })
        {
            continue;
        }
        if let Some(regex) = &regex {
            if !entry.file_type().is_file() {
                continue;
            }
            let Ok(content) = read_text(&path, 2 * 1024 * 1024) else {
                continue;
            };
            for (index, line) in content.replace("\r\n", "\n").split('\n').enumerate() {
                if results.len() >= limit {
                    break;
                }
                if regex.is_match(line) {
                    results.push(json!({"file":path,"line":index+1,"text":line.chars().take(500).collect::<String>()}));
                }
            }
        } else {
            if entry.file_type().is_dir() && args["includeDirectories"] == false
                || entry.file_type().is_file() && args["includeFiles"] == false
            {
                continue;
            }
            let target = if args["matchScope"] == "path" {
                path.to_string_lossy().into_owned()
            } else {
                name.into_owned()
            };
            let target = if case { target } else { target.to_lowercase() };
            let keyword = if case {
                keyword.to_owned()
            } else {
                keyword.to_lowercase()
            };
            let matched = match text(args, "matchMode") {
                "startsWith" => target.starts_with(&keyword),
                "endsWith" => target.ends_with(&keyword),
                "exact" => target == keyword,
                _ => target.contains(&keyword),
            };
            if matched {
                results.push(json!({"name":entry.file_name().to_string_lossy(),"path":path,"isDirectory":entry.file_type().is_dir()}));
            }
        }
    }
    if grep {
        Ok(json!({"path":source,"pattern":keyword,"count":results.len(),"matches":results}))
    } else {
        Ok(json!({"path":source,"keyword":keyword,"count":results.len(),"items":results}))
    }
}
fn tree(
    source: &Path,
    depth: usize,
    max: usize,
    count: &mut usize,
    workspaces: &Value,
) -> Result<Vec<Value>> {
    let mut nodes = Vec::new();
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        if *count >= max {
            break;
        }
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if excluded(&name.to_lowercase(), &Value::Null) {
            continue;
        }
        let path = checked_path(&entry.path().to_string_lossy(), workspaces)?;
        *count += 1;
        let directory = entry.file_type().is_ok_and(|v| v.is_dir());
        let mut node = json!({"name":name,"path":path,"isDirectory":directory});
        if directory && depth > 1 {
            node["children"] = json!(tree(&path, depth - 1, max, count, workspaces)?);
        }
        nodes.push(node);
    }
    Ok(nodes)
}
fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}
fn powershell(script: &str) -> Result<String> {
    let output =
        tauri::async_runtime::block_on(command_output("cmd.powershell", script, None, 60000))?;
    Ok(output["stdout"].as_str().unwrap_or("").trim().to_owned())
}
fn archive_or_hash(tool: &str, args: &Value, source: &Path, workspaces: &Value) -> Result<Value> {
    let quoted = ps_quote(&source.to_string_lossy());
    if tool == "file.hash" {
        let algorithm = text(args, "algorithm").to_uppercase();
        let algorithm = if algorithm.is_empty() {
            "SHA256"
        } else {
            algorithm.as_str()
        };
        if !["SHA1", "SHA256", "SHA384", "SHA512", "MD5"].contains(&algorithm) {
            return Err("Unsupported hash algorithm".into());
        }
        let hash = powershell(&format!(
            "(Get-FileHash -LiteralPath {quoted} -Algorithm {algorithm}).Hash"
        ))?;
        return Ok(json!({"path":source,"algorithm":algorithm,"hash":hash}));
    }
    if tool == "file.trash" {
        powershell(&format!("Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::{}({quoted},'OnlyErrorDialogs','SendToRecycleBin')",if source.is_dir(){"DeleteDirectory"}else{"DeleteFile"}))?;
        return Ok(json!({"path":source,"trashed":true}));
    }
    let raw = text(args, "destination");
    let default = if tool == "file.compress" {
        format!("{}.zip", source.display())
    } else {
        source
            .parent()
            .ok_or("Missing extraction directory")?
            .to_string_lossy()
            .into_owned()
    };
    let destination = checked_path(if raw.is_empty() { &default } else { raw }, workspaces)?;
    // Archive extraction is delegated to the platform zip implementation; destination remains confined.
    powershell(&format!(
        "{} -LiteralPath {quoted} -DestinationPath {} -Force",
        if tool == "file.compress" {
            "Compress-Archive"
        } else {
            "Expand-Archive"
        },
        ps_quote(&destination.to_string_lossy())
    ))?;
    if tool == "file.compress" {
        Ok(
            json!({"source":source,"destination":destination,"size":fs::metadata(&destination).map_err(|e|e.to_string())?.len()}),
        )
    } else {
        Ok(json!({"source":source,"destination":destination,"extracted":true}))
    }
}
fn settings(app: &AppHandle, tool: &str, args: &Value) -> Result<Value> {
    if tool.starts_with("alarm.") || tool.starts_with("todolist.") {
        return items(app, tool, args);
    }
    let registry: Value = serde_json::from_str(REGISTRY).map_err(|e| e.to_string())?;
    if tool == "island.settings.list" {
        let mut registry = registry.as_array().cloned().unwrap_or_default();
        for item in &mut registry {
            item["value"] = store(app, item["key"].as_str().unwrap_or(""), Value::Null);
        }
        return Ok(json!({"count":registry.len(),"settings":registry}));
    }
    let (key, value, field) = match tool {
        "island.theme.get" => (
            "theme-mode",
            store(app, "theme-mode", json!("dark")),
            "mode",
        ),
        "island.theme.set" => {
            let mode = text(args, "mode");
            (
                "theme-mode",
                json!(if ["dark", "light", "system"].contains(&mode) {
                    mode
                } else {
                    "dark"
                }),
                "mode",
            )
        }
        "island.opacity.get" => (
            "island-opacity",
            store(app, "island-opacity", json!(100)),
            "opacity",
        ),
        "island.opacity.set" => (
            "island-opacity",
            json!(args["opacity"]
                .as_f64()
                .ok_or("Opacity is required")?
                .round()
                .clamp(10., 100.)),
            "opacity",
        ),
        "island.settings.read" => (
            text(args, "key"),
            store(app, text(args, "key"), Value::Null),
            "value",
        ),
        "island.settings.write" => (text(args, "key"), args["value"].clone(), "value"),
        "island.restart" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_millis(500)).await;
                app.restart();
            });
            return Ok(json!({"restarting":true}));
        }
        _ => return Err(format!("Unsupported island tool: {tool}")),
    };
    if key.is_empty() {
        return Err("Setting key is required".into());
    }
    let mut result = json!({"key":key});
    result[field] = value.clone();
    if tool.ends_with(".set") || tool.ends_with(".write") {
        let channel = match key {
            "theme-mode" => Some("theme:mode"),
            "island-opacity" => Some("island:opacity"),
            "expand-mouseleave-idle" => Some("island:expand-mouseleave-idle"),
            "maxexpand-mouseleave-idle" => Some("island:maxexpand-mouseleave-idle"),
            "spring-animation" => Some("island:spring-animation"),
            "animation-speed" => Some("island:animation-speed"),
            _ => None,
        };
        if let Some(channel) = channel {
            crate::features::settings::handle(app, &format!("{channel}:set"), &value)?;
        } else {
            save(app, key, &value)?;
        }
        result[if tool.ends_with(".set") {
            "applied"
        } else {
            "written"
        }] = json!(true);
    } else if field == "value" {
        result["description"] = registry
            .as_array()
            .and_then(|items| items.iter().find(|item| item["key"] == key))
            .map(|item| item["description"].clone())
            .unwrap_or(Value::Null);
    }
    Ok(result)
}
fn items(app: &AppHandle, tool: &str, args: &Value) -> Result<Value> {
    let alarm = tool.starts_with("alarm.");
    let key = if alarm { "alarms" } else { "todos" };
    let action = tool.rsplit('.').next().unwrap_or("");
    let state = app.state::<Desktop>();
    let storage = state.store.lock().unwrap();
    let mut items = storage
        .value(key, json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default();
    if action == "list" {
        let mut result = json!({"count":items.len()});
        result[key] = json!(items);
        return Ok(result);
    }
    let mut result;
    if action == "create" {
        let id = now();
        let mut item = if alarm {
            json!({"id":id,"hour":args["hour"].as_u64().ok_or("Alarm hour is required")?.min(23),"minute":args["minute"].as_u64().ok_or("Alarm minute is required")?.min(59),"second":args["second"].as_u64().unwrap_or(0).min(59),"label":text(args,"label"),"enabled":args["enabled"]!=false,"repeat":args["repeat"].as_array().cloned().unwrap_or_default().into_iter().filter(|v|v.as_u64().is_some_and(|v|v<=6)).collect::<Vec<_>>(),"createdAt":id})
        } else {
            if text(args, "text").is_empty() {
                return Err("Todo text is required".into());
            }
            json!({"id":id,"text":text(args,"text"),"done":false,"createdAt":id,"description":text(args,"description"),"subTodos":[]})
        };
        for field in ["priority", "size"] {
            if !text(args, field).is_empty() {
                item[field] = args[field].clone();
            }
        }
        result = json!({"created":item});
        items.push(item);
    } else {
        let id = args["id"].as_u64().ok_or("Item ID is required")?;
        let index = items
            .iter()
            .position(|item| item["id"].as_u64() == Some(id))
            .ok_or("Item ID does not exist")?;
        match action {
            "delete" => {
                items.remove(index);
                result = json!({"remaining":items.len()});
                result[if alarm { "deletedId" } else { "deleted" }] = json!(id);
            }
            "toggle" => {
                let field = if alarm { "enabled" } else { "done" };
                items[index][field] = json!(if alarm {
                    args["enabled"] == true
                } else {
                    items[index][field] != true
                });
                result = json!({"id":id});
                result[field] = items[index][field].clone();
            }
            "update" => {
                let fields = if alarm {
                    vec!["hour", "minute", "second", "label", "repeat"]
                } else {
                    vec!["text", "priority", "size", "description"]
                };
                for field in fields {
                    if let Some(value) = args.get(field) {
                        items[index][field] = match field {
                            "hour" => json!(value.as_u64().unwrap_or(0).min(23)),
                            "minute" | "second" => json!(value.as_u64().unwrap_or(0).min(59)),
                            _ => value.clone(),
                        };
                    }
                }
                result = json!({"updated":items[index]});
            }
            _ => return Err(format!("Unsupported item operation: {action}")),
        }
    }
    storage.write(key, &json!(items))?;
    drop(storage);
    app.emit(
        "eisland-ipc",
        json!({"channel":"settings:changed","args":[format!("store:{key}"),items]}),
    )
    .map_err(|e| e.to_string())?;
    Ok(result)
}
const REGISTRY: &str = r#"[{"key":"theme-mode","description":"主题模式 (dark/light/system)","type":"string"},{"key":"island-corner-style","description":"刘海屏顶部边角 (rounded/concave，默认 rounded；concave 为顶部两侧反弧形；胶囊保持圆角；保存成功后同步所有窗口)","type":"string"},{"key":"island-opacity","description":"灵动岛透明度 (10-100)","type":"number"},{"key":"expand-mouseleave-idle","description":"Expand 鼠标移开自动回 idle","type":"boolean"},{"key":"maxexpand-mouseleave-idle","description":"MaxExpand 鼠标移开自动回 idle","type":"boolean"},{"key":"spring-animation","description":"弹性动画开关","type":"boolean"},{"key":"animation-speed","description":"动画速度 (slow/medium/fast)","type":"string"},{"key":"clipboard-url-monitor-enabled","description":"剪贴板 URL 监听开关","type":"boolean"},{"key":"clipboard-url-detect-mode","description":"剪贴板 URL 识别模式 (auto/strict)","type":"string"},{"key":"clipboard-url-blacklist","description":"剪贴板 URL 域名黑名单","type":"array"},{"key":"clipboard-url-suppress-in-url-favorites","description":"已收藏 URL 不再弹出通知","type":"boolean"},{"key":"autostart-mode","description":"开机自启模式 (disabled/enabled/high-priority)","type":"string"},{"key":"update-auto-prompt-enabled","description":"自动提示版本更新","type":"boolean"},{"key":"update-source","description":"更新源 (cloudflare-r2/github/tencent-cos/aliyun-oss)","type":"string"},{"key":"weather-alert-enabled","description":"天气预警通知","type":"boolean"},{"key":"island-position-offset","description":"灵动岛位置偏移 {x, y}","type":"object"},{"key":"island-position-locked","description":"pill 模式下锁定灵动岛位置","type":"boolean"},{"key":"island-display-id","description":"灵动岛显示器选择 (primary 或显示器 id)","type":"string"},{"key":"island-bg-opacity","description":"背景图片透明度 (0-100)","type":"number"},{"key":"island-bg-blur","description":"背景模糊度 (0-50)","type":"number"},{"key":"island-bg-video-fit","description":"背景视频适配模式 (cover/contain)","type":"string"},{"key":"island-bg-video-muted","description":"背景视频静音","type":"boolean"},{"key":"island-bg-video-loop","description":"背景视频循环","type":"boolean"},{"key":"island-bg-video-volume","description":"背景视频音量 (0-1)","type":"number"},{"key":"island-bg-video-rate","description":"背景视频播放速率 (0.25-2)","type":"number"},{"key":"island-bg-video-hw-decode","description":"背景视频硬件解码","type":"boolean"},{"key":"island-bg-sync-system-wallpaper","description":"同步系统桌面壁纸","type":"boolean"},{"key":"nav-order","description":"导航卡片顺序 {visibleOrder, hiddenOrder}","type":"object"},{"key":"hide-hotkey","description":"隐藏快捷键","type":"string"},{"key":"quit-hotkey","description":"退出快捷键","type":"string"},{"key":"screenshot-hotkey","description":"截图快捷键","type":"string"},{"key":"next-song-hotkey","description":"切歌快捷键","type":"string"},{"key":"play-pause-song-hotkey","description":"暂停/播放快捷键","type":"string"},{"key":"reset-position-hotkey","description":"还原位置快捷键","type":"string"},{"key":"toggle-tray-hotkey","description":"切换托盘图标快捷键","type":"string"},{"key":"show-settings-window-hotkey","description":"显示配置窗口快捷键","type":"string"},{"key":"open-clipboard-history-hotkey","description":"打开剪贴板历史快捷键","type":"string"},{"key":"toggle-passthrough-hotkey","description":"切换鼠标穿透快捷键","type":"string"},{"key":"toggle-ui-lock-hotkey","description":"切换 UI 锁定快捷键","type":"string"},{"key":"hide-process-list","description":"隐藏进程名单","type":"array"},{"key":"lyrics-clock","description":"歌词界面时钟开关","type":"boolean"},{"key":"mail-fetch-limit","description":"邮件获取数量限制","type":"number"},{"key":"standalone-window-mac-controls","description":"独立窗口 Mac 风格控制按钮","type":"boolean"}]"#;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn workspace_boundaries_reject_sibling_prefix_and_parent_escape() {
        let root = std::env::temp_dir();
        let ws = json!([root.join("eisland-agent-boundary").to_string_lossy()]);
        assert!(checked_path(
            &root
                .join("eisland-agent-boundary-sibling/file")
                .to_string_lossy(),
            &ws
        )
        .is_err());
        assert!(checked_path(
            &root
                .join("eisland-agent-boundary/../escape")
                .to_string_lossy(),
            &ws
        )
        .is_err());
        assert!(checked_path(
            &root.join("eisland-agent-boundary/file").to_string_lossy(),
            &ws
        )
        .is_ok());
    }
    #[test]
    fn powershell_paths_escape_quotes_without_interpolation() {
        assert_eq!(ps_quote("a'b$()"), "'a''b$()'");
    }
}
