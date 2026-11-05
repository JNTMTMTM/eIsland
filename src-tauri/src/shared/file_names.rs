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

//! Compatibility for task filenames previously serialized as platform-specific OsStr objects.
use serde_json::{json, Value};

/// Repair only the display name, preserving task state and native continuation metadata.
pub(crate) fn repair_file_name(task: &mut Value, path_keys: &[&str]) -> bool {
    if !task.is_object() || task["fileName"].is_string() {
        return false;
    }
    let path = path_keys.iter().find_map(|key| {
        task[*key]
            .as_str()
            .and_then(|path| path.rsplit(['\\', '/']).find(|name| !name.is_empty()))
            .map(str::to_owned)
    });
    let old_windows = task["fileName"]["Windows"]
        .as_array()
        .and_then(|characters| {
            characters
                .iter()
                .map(|value| value.as_u64().and_then(|value| u16::try_from(value).ok()))
                .collect::<Option<Vec<_>>>()
        })
        .map(|characters| String::from_utf16_lossy(&characters));
    let old_unix = task["fileName"]["Unix"]
        .as_array()
        .and_then(|characters| {
            characters
                .iter()
                .map(|value| value.as_u64().and_then(|value| u8::try_from(value).ok()))
                .collect::<Option<Vec<_>>>()
        })
        .map(|characters| String::from_utf8_lossy(&characters).into_owned());
    let url = task["url"]
        .as_str()
        .and_then(|url| reqwest::Url::parse(url).ok())
        .and_then(|url| {
            url.path_segments()?
                .rfind(|name| !name.is_empty())
                .map(str::to_owned)
        });
    task["fileName"] = json!(path
        .or(old_windows)
        .or(old_unix)
        .or(url)
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "download.bin".into()));
    true
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legacy_windows_names_keep_unicode_paths_and_every_other_task_field() {
        let mut task = json!({"id":"existing","fileName":{"Windows":[65,66]},"savePath":"C:\\Downloads\\歌曲😀.zip","status":"paused","downloadedBytes":123,"_parts":[{"path":"existing.part","downloaded":123}]});
        let before = task.clone();
        assert!(repair_file_name(&mut task, &["savePath"]));
        assert_eq!(task["fileName"], "歌曲😀.zip");
        task["fileName"] = before["fileName"].clone();
        assert_eq!(task, before);
        let mut existing = json!({"fileName":"keep exactly"});
        assert!(!repair_file_name(&mut existing, &["savePath"]));
    }
    #[test]
    fn legacy_encoding_and_url_fallbacks_never_emit_objects() {
        let mut task = json!({"fileName":{"Windows":[20320,22909,55357,56832]}});
        repair_file_name(&mut task, &[]);
        assert_eq!(task["fileName"], "你好😀");
        let mut task = json!({"fileName":{"Unix":[104,101,108,108,111]}});
        repair_file_name(&mut task, &[]);
        assert_eq!(task["fileName"], "hello");
        let mut task = json!({"fileName":null,"url":"https://example.test/file.zip"});
        repair_file_name(&mut task, &[]);
        assert_eq!(task["fileName"], "file.zip");
        let mut task = json!({"fileName":{}});
        repair_file_name(&mut task, &[]);
        assert!(task["fileName"].is_string());
        assert!(!repair_file_name(&mut Value::Null, &[]));
    }
}
