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

//! Streaming file digests shared by native toolbox and Agent adapters.
use crate::shared::Result;
use sha2::Digest;
use std::{fs::File, io::Read, path::Path};

/// Parse the supported digest algorithms without changing a caller's display convention.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Algorithm {
    Md5,
    Sha1,
    Sha256,
    Sha384,
    Sha512,
}
impl Algorithm {
    pub fn parse(value: &str) -> Result<Self> {
        match value.to_ascii_lowercase().as_str() {
            "md5" => Ok(Self::Md5),
            "sha1" => Ok(Self::Sha1),
            "sha256" => Ok(Self::Sha256),
            "sha384" => Ok(Self::Sha384),
            "sha512" => Ok(Self::Sha512),
            _ => Err("Unsupported hash algorithm".into()),
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Self::Md5 => "md5",
            Self::Sha1 => "sha1",
            Self::Sha256 => "sha256",
            Self::Sha384 => "sha384",
            Self::Sha512 => "sha512",
        }
    }
}
fn digest<D: Digest + Default>(mut file: File) -> Result<String> {
    let mut hash = D::default();
    let mut buffer = [0u8; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(hex::encode(hash.finalize()))
}
/// Hash a file in bounded memory; result is lowercase hex, display casing belongs to adapters.
pub fn file(path: &Path, algorithm: Algorithm) -> Result<String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    match algorithm {
        Algorithm::Md5 => digest::<md5::Md5>(file),
        Algorithm::Sha1 => digest::<sha1::Sha1>(file),
        Algorithm::Sha256 => digest::<sha2::Sha256>(file),
        Algorithm::Sha384 => digest::<sha2::Sha384>(file),
        Algorithm::Sha512 => digest::<sha2::Sha512>(file),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn published_vectors_all_algorithms_and_missing_file() {
        let path = std::env::temp_dir().join(format!("eisland-hash-{}", uuid::Uuid::new_v4()));
        std::fs::write(&path, b"abc").unwrap();
        for (name,expected) in [
            ("MD5","900150983cd24fb0d6963f7d28e17f72"),
            ("sha1","a9993e364706816aba3e25717850c26c9cd0d89d"),
            ("sha256","ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            ("sha384","cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7"),
            ("sha512","ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f")
        ] { let algorithm=Algorithm::parse(name).unwrap(); assert_eq!(file(&path,algorithm).unwrap(),expected); assert_eq!(Algorithm::parse(algorithm.name()).unwrap(),algorithm); }
        assert!(Algorithm::parse("crc32").is_err());
        std::fs::remove_file(&path).unwrap();
        assert!(file(&path, Algorithm::Sha256).is_err());
    }
    #[test]
    fn digest_streams_more_than_a_buffer_and_empty_input() {
        let path = std::env::temp_dir().join(format!("eisland-hash-{}", uuid::Uuid::new_v4()));
        let content = vec![42; 140000];
        std::fs::write(&path, &content).unwrap();
        assert_eq!(
            file(&path, Algorithm::Sha256).unwrap(),
            hex::encode(sha2::Sha256::digest(&content))
        );
        std::fs::write(&path, []).unwrap();
        assert_eq!(
            file(&path, Algorithm::Md5).unwrap(),
            "d41d8cd98f00b204e9800998ecf8427e"
        );
        std::fs::remove_file(path).unwrap();
    }
}
