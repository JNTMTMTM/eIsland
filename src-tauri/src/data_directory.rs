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

use std::path::{Path, PathBuf};

/// Reuse an existing business store without moving files or changing WebView profile storage.
pub fn select(app_data: &Path, config: &Path, debug_override: Option<&Path>) -> PathBuf {
    if let Some(directory) = debug_override {
        return directory.to_path_buf();
    }
    let current = app_data.join("eIsland_store");
    let legacy = config.join("eIsland").join("eIsland_store");
    if current.is_dir() || !legacy.is_dir() {
        current
    } else {
        legacy
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static SEQUENCE: AtomicU64 = AtomicU64::new(0);
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!(
                "eisland-data-directory-{}-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos(),
                SEQUENCE.fetch_add(1, Ordering::Relaxed),
            ));
            std::fs::create_dir_all(&root).unwrap();
            Self(root)
        }
        fn app_data(&self) -> PathBuf {
            self.0.join("config/com.pyisland.eisland")
        }
        fn config(&self) -> PathBuf {
            self.0.join("config")
        }
        fn legacy(&self) -> PathBuf {
            self.config().join("eIsland/eIsland_store")
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            std::fs::remove_dir_all(&self.0).unwrap();
        }
    }
    #[test]
    fn existing_tauri_store_wins_without_touching_either_business_directory() {
        let fixture = Fixture::new();
        let current = fixture.app_data().join("eIsland_store");
        let legacy = fixture.legacy();
        for directory in [&current, &legacy] {
            std::fs::create_dir_all(directory).unwrap();
            std::fs::write(directory.join("theme-mode.json"), b"\"light\"").unwrap();
        }
        assert_eq!(
            select(&fixture.app_data(), &fixture.config(), None),
            current
        );
        assert_eq!(
            std::fs::read(legacy.join("theme-mode.json")).unwrap(),
            b"\"light\""
        );
        assert_eq!(
            std::fs::read(current.join("theme-mode.json")).unwrap(),
            b"\"light\""
        );
    }
    #[test]
    fn legacy_store_is_reused_when_tauri_store_does_not_exist() {
        let fixture = Fixture::new();
        std::fs::create_dir_all(fixture.legacy()).unwrap();
        assert_eq!(
            select(&fixture.app_data(), &fixture.config(), None),
            fixture.legacy()
        );
        assert!(!fixture.app_data().exists());
    }
    #[test]
    fn new_user_defaults_to_tauri_without_creating_or_moving_directories() {
        let fixture = Fixture::new();
        assert_eq!(
            select(&fixture.app_data(), &fixture.config(), None),
            fixture.app_data().join("eIsland_store")
        );
        assert!(!fixture.app_data().exists());
        assert!(!fixture.legacy().exists());
    }
    #[test]
    fn debug_override_has_priority_even_when_both_stores_exist() {
        let fixture = Fixture::new();
        std::fs::create_dir_all(fixture.app_data().join("eIsland_store")).unwrap();
        std::fs::create_dir_all(fixture.legacy()).unwrap();
        let override_path = fixture.0.join("isolated-test-store");
        assert_eq!(
            select(&fixture.app_data(), &fixture.config(), Some(&override_path)),
            override_path
        );
        assert!(!override_path.exists());
    }
}
