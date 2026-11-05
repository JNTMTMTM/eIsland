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

//! Bounded ZIP processing shared by Agent and extension adapters.
use crate::shared::Result;
use std::{
    collections::HashSet,
    fs::{self, File, OpenOptions},
    io::Read,
    path::{Component, Path, PathBuf},
};
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub entries: usize,
    pub bytes: u64,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            entries: 4096,
            bytes: 512 * 1024 * 1024,
        }
    }
}
struct Temporary(PathBuf);
impl Drop for Temporary {
    fn drop(&mut self) {
        if self.0.is_dir() {
            let _ = fs::remove_dir_all(&self.0);
        } else {
            let _ = fs::remove_file(&self.0);
        }
    }
}
fn temporary(parent: &Path, suffix: &str) -> PathBuf {
    parent.join(format!(
        ".eisland-archive-{}.{}",
        uuid::Uuid::new_v4(),
        suffix
    ))
}
fn safe_relative(name: &str) -> Result<PathBuf> {
    if name.is_empty() || name.contains(['\\', ':', '\0']) || name.starts_with('/') {
        return Err("Invalid archive entry path".into());
    }
    let path = Path::new(name);
    if path
        .components()
        .any(|part| !matches!(part, Component::Normal(_) | Component::CurDir))
    {
        return Err("Archive path escapes destination".into());
    }
    for part in path.components() {
        if let Component::Normal(value) = part {
            let value = value.to_string_lossy();
            let stem = value.split('.').next().unwrap_or("").to_ascii_uppercase();
            if value.ends_with(['.', ' '])
                || value.chars().any(|c| c.is_control())
                || matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
                || (stem.len() == 4
                    && (stem.starts_with("COM") || stem.starts_with("LPT"))
                    && stem.as_bytes()[3].is_ascii_digit())
            {
                return Err("Invalid Windows archive entry path".into());
            }
        }
    }
    let normalized = path
        .components()
        .filter_map(|part| {
            if let Component::Normal(value) = part {
                Some(value)
            } else {
                None
            }
        })
        .collect::<PathBuf>();
    if normalized.as_os_str().is_empty() {
        return Err("Empty archive entry path".into());
    }
    Ok(normalized)
}
fn no_symlinks(path: &Path) -> Result<()> {
    for ancestor in path.ancestors() {
        match fs::symlink_metadata(ancestor) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err("Archive destination contains a symbolic link".into())
            }
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => {
                return Err(error.to_string())
            }
            _ => {}
        }
    }
    Ok(())
}
/// Expand into a private sibling staging directory, validating every entry before replacing
/// user files. Reparse/symbolic-link destinations are rejected even inside an allowed root.
pub fn extract(source: &Path, destination: &Path, overwrite: bool, limits: Limits) -> Result<()> {
    no_symlinks(destination)?;
    if destination.exists() && !destination.is_dir() {
        return Err("Extraction destination is not a directory".into());
    }
    let parent = destination
        .parent()
        .ok_or("Missing archive destination parent")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(File::open(source).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if archive.len() > limits.entries {
        return Err("Archive has too many entries".into());
    }
    let mut total = 0u64;
    let mut names = HashSet::new();
    let mut entries = Vec::new();
    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let relative = safe_relative(entry.name())?;
        if !names.insert(relative.to_string_lossy().to_lowercase()) {
            return Err("Duplicate archive destination".into());
        }
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Archive symbolic links are not supported".into());
        }
        total = total
            .checked_add(entry.size())
            .ok_or("Archive exceeds extraction limit")?;
        if total > limits.bytes {
            return Err("Archive exceeds extraction limit".into());
        }
        let target = destination.join(&relative);
        no_symlinks(&target)?;
        if target.exists() && !entry.is_dir() && (!overwrite || !target.is_file()) {
            return Err("Archive destination already exists".into());
        }
        entries.push((relative, entry.is_dir()));
    }
    let staging = Temporary(temporary(parent, "stage"));
    fs::create_dir(&staging.0).map_err(|e| e.to_string())?;
    let mut copied = 0u64;
    for (index, (relative, directory)) in entries.iter().enumerate() {
        let target = staging.0.join(relative);
        if *directory {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
            continue;
        }
        fs::create_dir_all(target.parent().ok_or("Missing entry directory")?)
            .map_err(|e| e.to_string())?;
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&target)
            .map_err(|e| e.to_string())?;
        let written = std::io::copy(
            &mut (&mut entry).take(limits.bytes.saturating_sub(copied) + 1),
            &mut file,
        )
        .map_err(|e| e.to_string())?;
        copied = copied
            .checked_add(written)
            .ok_or("Archive exceeds extraction limit")?;
        if copied > limits.bytes || written != entry.size() {
            return Err("Archive exceeds extraction limit or has invalid size".into());
        }
        file.sync_all().map_err(|e| e.to_string())?;
    }
    no_symlinks(destination)?;
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    for (relative, directory) in entries {
        let target = destination.join(&relative);
        no_symlinks(&target)?;
        if directory {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
        } else {
            if target.exists() && !overwrite {
                return Err("Archive destination already exists".into());
            }
            fs::create_dir_all(target.parent().ok_or("Missing entry directory")?)
                .map_err(|e| e.to_string())?;
            fs::rename(staging.0.join(relative), &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
/// Compress files with ZIP's streaming writer; successful finalization precedes replacement.
/// Directory archives retain their root folder, matching the existing Agent contract.
pub fn compress(source: &Path, destination: &Path, overwrite: bool, limits: Limits) -> Result<u64> {
    let source = source.canonicalize().map_err(|e| e.to_string())?;
    if destination.canonicalize().ok().as_ref() == Some(&source)
        || (source.is_dir() && destination.starts_with(&source))
    {
        return Err("Archive destination cannot replace or be inside its source".into());
    }
    no_symlinks(destination)?;
    if destination.exists() && (!overwrite || !destination.is_file()) {
        return Err("Archive destination already exists".into());
    }
    let root = source.parent().ok_or("Archive source has no parent")?;
    let mut entries = Vec::new();
    let mut total = 0u64;
    for item in walkdir::WalkDir::new(&source).follow_links(false) {
        let item = item.map_err(|e| e.to_string())?;
        if item.file_type().is_symlink() {
            return Err("Archive symbolic links are not supported".into());
        }
        if entries.len() >= limits.entries {
            return Err("Archive has too many entries".into());
        }
        let metadata = item.metadata().map_err(|e| e.to_string())?;
        if !metadata.is_dir() && !metadata.is_file() {
            return Err("Unsupported archive source entry".into());
        }
        if metadata.is_file() {
            total = total
                .checked_add(metadata.len())
                .ok_or("Archive exceeds input limit")?;
            if total > limits.bytes {
                return Err("Archive exceeds input limit".into());
            }
        }
        entries.push((item.path().to_owned(), metadata.is_dir()));
    }
    let parent = destination
        .parent()
        .ok_or("Missing archive destination parent")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = Temporary(temporary(parent, "zip"));
    let file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary.0)
        .map_err(|e| e.to_string())?;
    let mut writer = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let mut copied = 0u64;
    for (path, directory) in entries {
        let name = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        if directory {
            writer
                .add_directory(name, options)
                .map_err(|e| e.to_string())?;
        } else {
            writer
                .start_file(name, options)
                .map_err(|e| e.to_string())?;
            let written = std::io::copy(
                &mut File::open(path)
                    .map_err(|e| e.to_string())?
                    .take(limits.bytes.saturating_sub(copied) + 1),
                &mut writer,
            )
            .map_err(|e| e.to_string())?;
            copied = copied
                .checked_add(written)
                .ok_or("Archive exceeds input limit")?;
            if copied > limits.bytes {
                return Err("Archive exceeds input limit".into());
            }
        }
    }
    let output = writer.finish().map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())?;
    let size = output.metadata().map_err(|e| e.to_string())?.len();
    drop(output);
    no_symlinks(destination)?;
    if destination.exists() && !overwrite {
        return Err("Archive destination already exists".into());
    }
    fs::rename(&temporary.0, destination).map_err(|e| e.to_string())?;
    Ok(size)
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let p =
                std::env::temp_dir().join(format!("eisland-archive-test-{}", uuid::Uuid::new_v4()));
            fs::create_dir(&p).unwrap();
            Self(p)
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn zip(path: &Path, entries: &[(&str, &[u8])]) {
        let mut writer = ZipWriter::new(File::create(path).unwrap());
        for (name, bytes) in entries {
            writer
                .start_file(*name, SimpleFileOptions::default())
                .unwrap();
            writer.write_all(bytes).unwrap();
        }
        writer.finish().unwrap();
    }
    #[test]
    fn roundtrip_preserves_unicode_root_and_overwrite_policy() {
        let f = Fixture::new();
        let source = f.0.join("资料");
        fs::create_dir(&source).unwrap();
        fs::write(source.join("😀.txt"), b"content").unwrap();
        let archive = f.0.join("out.zip");
        assert!(compress(&source, &archive, false, Limits::default()).unwrap() > 0);
        assert!(compress(&source, &archive, false, Limits::default()).is_err());
        let dest = f.0.join("result");
        extract(&archive, &dest, false, Limits::default()).unwrap();
        assert_eq!(fs::read(dest.join("资料/😀.txt")).unwrap(), b"content");
        assert!(extract(&archive, &dest, false, Limits::default()).is_err());
        fs::write(dest.join("资料/😀.txt"), b"old").unwrap();
        extract(&archive, &dest, true, Limits::default()).unwrap();
        assert_eq!(fs::read(dest.join("资料/😀.txt")).unwrap(), b"content");
    }
    #[test]
    fn rejects_traversal_ads_absolute_and_duplicate_names() {
        let f = Fixture::new();
        for name in [
            "../escape",
            "/absolute",
            "C:/drive",
            "x\\..\\escape",
            "safe.txt:ads",
            ".. /escape",
            "NUL.txt",
        ] {
            let path = f.0.join("bad.zip");
            zip(&path, &[(name, b"bad")]);
            assert!(
                extract(&path, &f.0.join("dest"), true, Limits::default()).is_err(),
                "{name}"
            );
        }
        let path = f.0.join("duplicates.zip");
        zip(&path, &[("A.txt", b"one"), ("a.txt", b"two")]);
        assert!(extract(&path, &f.0.join("dest"), true, Limits::default()).is_err());
        assert!(!f.0.join("escape").exists());
    }
    #[test]
    fn size_entry_limits_and_invalid_zip_do_not_modify_existing_files() {
        let f = Fixture::new();
        let path = f.0.join("input.zip");
        zip(&path, &[("one", b"12345"), ("two", b"67890")]);
        let dest = f.0.join("dest");
        fs::create_dir(&dest).unwrap();
        fs::write(dest.join("one"), b"existing").unwrap();
        for limits in [
            Limits {
                entries: 1,
                bytes: 100,
            },
            Limits {
                entries: 10,
                bytes: 9,
            },
        ] {
            assert!(extract(&path, &dest, true, limits).is_err());
            assert_eq!(fs::read(dest.join("one")).unwrap(), b"existing");
        }
        fs::write(&path, b"not zip").unwrap();
        assert!(extract(&path, &dest, true, Limits::default()).is_err());
        assert!(compress(
            &dest,
            &f.0.join("small.zip"),
            true,
            Limits {
                entries: 100,
                bytes: 1
            }
        )
        .is_err());
    }
    #[test]
    fn rejects_zip_symlink_and_corrupt_payload_before_overwriting_user_file() {
        let f = Fixture::new();
        let path = f.0.join("input.zip");
        let mut writer = ZipWriter::new(File::create(&path).unwrap());
        writer
            .add_symlink("link", "../outside", SimpleFileOptions::default())
            .unwrap();
        writer.finish().unwrap();
        assert!(extract(&path, &f.0.join("dest"), true, Limits::default()).is_err());
        let mut writer = ZipWriter::new(File::create(&path).unwrap());
        writer
            .start_file(
                "saved.txt",
                SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored),
            )
            .unwrap();
        writer.write_all(b"unique-payload").unwrap();
        writer.finish().unwrap();
        let mut bytes = fs::read(&path).unwrap();
        let offset = bytes
            .windows(14)
            .position(|window| window == b"unique-payload")
            .unwrap();
        bytes[offset] = b'X';
        fs::write(&path, bytes).unwrap();
        let dest = f.0.join("dest");
        fs::create_dir_all(&dest).unwrap();
        fs::write(dest.join("saved.txt"), b"existing").unwrap();
        assert!(extract(&path, &dest, true, Limits::default()).is_err());
        assert_eq!(fs::read(dest.join("saved.txt")).unwrap(), b"existing");
    }
    #[cfg(unix)]
    #[test]
    fn rejects_existing_destination_symlinks() {
        let f = Fixture::new();
        let path = f.0.join("input.zip");
        zip(&path, &[("link/escape", b"bad")]);
        let dest = f.0.join("dest");
        let outside = f.0.join("outside");
        fs::create_dir(&dest).unwrap();
        fs::create_dir(&outside).unwrap();
        std::os::unix::fs::symlink(&outside, dest.join("link")).unwrap();
        assert!(extract(&path, &dest, true, Limits::default()).is_err());
        assert!(!outside.join("escape").exists());
    }
}
