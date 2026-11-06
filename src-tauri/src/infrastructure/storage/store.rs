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

//! Cached per-key JSON storage with same-directory atomic replacement.
use serde_json::Value;
use std::{collections::HashMap, io::Write, path::PathBuf, sync::Mutex, time::SystemTime};
#[derive(Clone, PartialEq)]
struct Stamp {
    length: u64,
    modified: Option<SystemTime>,
}
#[derive(Clone)]
struct Cached {
    stamp: Stamp,
    value: Value,
}
pub struct Store {
    pub directory: PathBuf,
    cache: Mutex<HashMap<PathBuf, Cached>>,
}
impl Store {
    pub fn new(directory: PathBuf) -> Self {
        Self {
            directory,
            cache: Mutex::new(HashMap::new()),
        }
    }
    fn path(&self, key: &str) -> Result<PathBuf, String> {
        if key.is_empty()
            || key.len() > 180
            || !key
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
            || key.contains("..")
        {
            return Err("Invalid store key".into());
        }
        Ok(self.directory.join(format!("{key}.json")))
    }
    fn stamp(path: &std::path::Path) -> Result<Stamp, std::io::Error> {
        let metadata = std::fs::metadata(path)?;
        Ok(Stamp {
            length: metadata.len(),
            modified: metadata.modified().ok(),
        })
    }
    pub fn read(&self, key: &str) -> Result<Value, String> {
        let path = self.path(key)?;
        let stamp = match Self::stamp(&path) {
            Ok(stamp) => stamp,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                self.cache.lock().unwrap().remove(&path);
                return Ok(Value::Null);
            }
            Err(error) => return Err(error.to_string()),
        };
        if let Some(cached) = self
            .cache
            .lock()
            .unwrap()
            .get(&path)
            .filter(|cached| cached.stamp == stamp)
        {
            return Ok(cached.value.clone());
        }
        let bytes = std::fs::read(&path).map_err(|error| error.to_string())?;
        let value: Value = serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
        // Only cache a stable snapshot. An external atomic replacement may race this read.
        if bytes.len() <= 512 * 1024
            && stamp.modified.is_some()
            && Self::stamp(&path).ok().as_ref() == Some(&stamp)
        {
            let mut cache = self.cache.lock().unwrap();
            if cache.len() >= 128
                || cache.values().map(|entry| entry.stamp.length).sum::<u64>() + stamp.length
                    > 8 * 1024 * 1024
            {
                cache.clear();
            }
            cache.insert(
                path,
                Cached {
                    stamp,
                    value: value.clone(),
                },
            );
        }
        Ok(value)
    }
    pub fn write(&self, key: &str, value: &Value) -> Result<(), String> {
        let path = self.path(key)?;
        let bytes = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
        std::fs::create_dir_all(&self.directory).map_err(|error| error.to_string())?;
        let temporary = self
            .directory
            .join(format!(".{key}-{}.tmp", uuid::Uuid::new_v4()));
        let result = (|| {
            let mut file = std::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&temporary)?;
            file.write_all(&bytes)?;
            file.sync_all()?;
            drop(file);
            // rename replaces atomically on Windows/Unix; no delete-then-write gap.
            std::fs::rename(&temporary, &path)
        })();
        if let Err(error) = result {
            let _ = std::fs::remove_file(&temporary);
            return Err(error.to_string());
        }
        // Let the next reader validate metadata before returning any cached JSON.
        self.cache.lock().unwrap().remove(&path);
        Ok(())
    }
    pub fn value(&self, key: &str, fallback: Value) -> Value {
        self.read(key)
            .ok()
            .filter(|value| !value.is_null())
            .unwrap_or(fallback)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn store() -> Store {
        Store::new(std::env::temp_dir().join(format!("eisland-store-{}", uuid::Uuid::new_v4())))
    }
    #[test]
    fn json_layout_cache_invalidation_and_null_fallback_are_compatible() {
        let store = store();
        assert_eq!(store.read("missing").unwrap(), Value::Null);
        store.write("a", &json!({"history":[1,2,3]})).unwrap();
        assert_eq!(store.read("a").unwrap(), json!({"history":[1,2,3]}));
        assert_eq!(store.read("a").unwrap(), json!({"history":[1,2,3]}));
        assert_eq!(store.cache.lock().unwrap().len(), 1);
        std::fs::write(store.directory.join("a.json"), b"[4,5]").unwrap();
        assert_eq!(store.read("a").unwrap(), json!([4, 5]));
        std::fs::write(store.directory.join("a.json"), b"malformed").unwrap();
        assert!(store.read("a").is_err());
        assert_eq!(store.value("a", json!("fallback")), "fallback");
        store.write("a", &Value::Null).unwrap();
        assert_eq!(store.value("a", json!("fallback")), "fallback");
        std::fs::remove_file(store.directory.join("a.json")).unwrap();
        assert_eq!(store.read("a").unwrap(), Value::Null);
        for key in ["", "../escape", "a..b", "x/y", "x\\y", "name:name"] {
            assert!(store.write(key, &Value::Null).is_err());
        }
        assert!(store.read(&"x".repeat(181)).is_err());
        std::fs::remove_dir(store.directory).unwrap();
    }
    #[test]
    fn concurrent_atomic_writes_never_expose_partial_json_or_leave_staging_files() {
        let store = store();
        store.write("task", &json!({"payload":"old"})).unwrap();
        let directory = store.directory.clone();
        let writer = std::thread::spawn(move || {
            let other = Store::new(directory);
            for n in 0..100 {
                other
                    .write("task", &json!({"id":n,"payload":"x".repeat(n*8)}))
                    .unwrap();
            }
        });
        for _ in 0..200 {
            let raw = std::fs::read(store.directory.join("task.json")).unwrap();
            assert!(serde_json::from_slice::<Value>(&raw).unwrap().is_object());
        }
        writer.join().unwrap();
        assert_eq!(store.read("task").unwrap()["id"], 99);
        assert_eq!(std::fs::read_dir(&store.directory).unwrap().count(), 1);
        std::fs::remove_dir_all(store.directory).unwrap();
    }
    #[test]
    fn failed_commit_keeps_previous_target_and_cleans_temporary_file() {
        let store = store();
        std::fs::create_dir_all(store.directory.join("blocked.json")).unwrap();
        assert!(store.write("blocked", &json!(1)).is_err());
        assert!(store.directory.join("blocked.json").is_dir());
        assert_eq!(std::fs::read_dir(&store.directory).unwrap().count(), 1);
        std::fs::remove_dir_all(store.directory).unwrap();
    }
    #[test]
    fn cache_has_key_and_byte_budgets_and_skips_large_history() {
        let store = store();
        store
            .write("large", &json!("x".repeat(512 * 1024)))
            .unwrap();
        assert!(store.read("large").unwrap().is_string());
        assert!(store.cache.lock().unwrap().is_empty());
        for index in 0..129 {
            let key = format!("key-{index}");
            store.write(&key, &json!(index)).unwrap();
            store.read(&key).unwrap();
        }
        assert_eq!(store.cache.lock().unwrap().len(), 1);
        for index in 0..20 {
            let key = format!("medium-{index}");
            store.write(&key, &json!("x".repeat(450 * 1024))).unwrap();
            store.read(&key).unwrap();
        }
        assert!(
            store
                .cache
                .lock()
                .unwrap()
                .values()
                .map(|entry| entry.stamp.length)
                .sum::<u64>()
                <= 8 * 1024 * 1024
        );
        std::fs::remove_dir_all(store.directory).unwrap();
    }
}
