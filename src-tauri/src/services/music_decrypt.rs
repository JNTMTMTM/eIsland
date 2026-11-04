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

use crate::windows::Result;
use aes::cipher::{KeyIvInit, StreamCipher};
use base64::{engine::general_purpose::STANDARD, Engine};
type AesCtr = ctr::Ctr128BE<aes::Aes128>;

fn be32(bytes: &[u8], offset: usize) -> Result<usize> {
    bytes
        .get(offset..offset + 4)
        .map(|v| u32::from_be_bytes(v.try_into().unwrap()) as usize)
        .ok_or_else(|| "QISHUI_AUDIO_CONTAINER_INVALID".into())
}
fn find(bytes: &[u8], kind: &[u8], start: usize, end: usize) -> Result<(usize, usize)> {
    let mut position = start;
    while position.checked_add(8).is_some_and(|v| v <= end) && end <= bytes.len() {
        let size = be32(bytes, position)?;
        if size < 8 || position.checked_add(size).is_none_or(|v| v > end) {
            break;
        }
        if &bytes[position + 4..position + 8] == kind {
            return Ok((position, position + size));
        }
        position += size;
    }
    Err("QISHUI_AUDIO_CONTAINER_INVALID".into())
}
fn spade(value: &str) -> String {
    let Ok(source) = STANDARD.decode(value) else {
        return String::new();
    };
    if source.len() < 3 {
        return String::new();
    }
    let padding = (source[0] ^ source[1] ^ source[2]) as i32 - 48;
    if padding < 0 || source.len() < padding as usize + 2 {
        return String::new();
    }
    let input = &source[1..source.len() - padding as usize];
    let mut decoded = Vec::with_capacity(input.len());
    for (index, byte) in input.iter().enumerate() {
        let previous = if index == 0 {
            0xfa
        } else if index == 1 {
            0x55
        } else {
            input[index - 2]
        };
        let mut value = (byte ^ previous) as i32 - index.count_ones() as i32 - 21;
        while value < 0 {
            value += 255;
        }
        decoded.push((value & 255) as u8);
    }
    let skip = match decoded[0] {
        b'0'..=b'9' => decoded[0] - b'0',
        b'a'..=b'z' => decoded[0] - b'a' + 10,
        _ => 255,
    } as usize;
    let Some(end) = (source.len() - padding as usize - 1).checked_sub(skip) else {
        return String::new();
    };
    decoded
        .get(1..end)
        .map(|value| String::from_utf8_lossy(value).into_owned())
        .unwrap_or_default()
}
pub(super) fn decrypt(bytes: &[u8], auth: &str) -> Result<(Vec<u8>, String)> {
    let key = if auth.bytes().all(|c| c.is_ascii_hexdigit()) {
        auth.to_owned()
    } else {
        spade(auth)
    };
    if key.len() != 32 {
        return Err("QISHUI_AUDIO_KEY_INVALID".into());
    }
    let key = (0..16)
        .map(|index| {
            u8::from_str_radix(&key[index * 2..index * 2 + 2], 16)
                .map_err(|_| "QISHUI_AUDIO_KEY_INVALID")
        })
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let moov = find(bytes, b"moov", 0, bytes.len())?;
    let mut parent = moov;
    for kind in [b"trak", b"mdia", b"minf", b"stbl"] {
        parent = find(bytes, kind, parent.0 + 8, parent.1)?;
    }
    let stsd = find(bytes, b"stsd", parent.0 + 8, parent.1)?;
    let stsz = find(bytes, b"stsz", parent.0 + 8, parent.1)?;
    let senc = find(bytes, b"senc", moov.0 + 8, moov.1)
        .or_else(|_| find(bytes, b"senc", parent.0 + 8, parent.1))?;
    let mdat = find(bytes, b"mdat", 0, bytes.len())?;
    let sizes = &bytes[stsz.0 + 8..stsz.1];
    let vectors = &bytes[senc.0 + 8..senc.1];
    let fixed = be32(sizes, 4)?;
    let count = be32(sizes, 8)?;
    if count != be32(vectors, 4)? {
        return Err("QISHUI_AUDIO_SAMPLE_COUNT_MISMATCH".into());
    }
    if (fixed == 0 && count > sizes.len().saturating_sub(12) / 4)
        || count > vectors.len().saturating_sub(8) / 8
    {
        return Err("QISHUI_AUDIO_CONTAINER_INVALID".into());
    }
    let mut total = 0usize;
    for index in 0..count {
        total = total
            .checked_add(if fixed == 0 {
                be32(sizes, 12 + index * 4)?
            } else {
                fixed
            })
            .ok_or("QISHUI_AUDIO_CONTAINER_INVALID")?;
        if total > mdat.1 - mdat.0 - 8 {
            return Err("QISHUI_AUDIO_CONTAINER_INVALID".into());
        }
    }
    let description = &bytes[stsd.0 + 8..stsd.1];
    let metadata = description
        .windows(4)
        .position(|window| window == b"dfLa")
        .filter(|index| *index >= 4)
        .and_then(|index| be32(description, index - 4).ok().map(|size| (index, size)))
        .and_then(|(index, size)| {
            description.get(index + 4..(index - 4 + size).min(description.len()))
        })
        .unwrap_or_default();
    let flac = !metadata.is_empty();
    let mut output = if flac {
        let mut output = Vec::with_capacity(4 + metadata.len() + total);
        output.extend_from_slice(b"fLaC");
        output.extend_from_slice(metadata);
        output.resize(4 + metadata.len() + total, 0);
        output
    } else {
        bytes.to_vec()
    };
    let mut read = mdat.0 + 8;
    let mut write = if flac { 4 + metadata.len() } else { read };
    for index in 0..count {
        let size = if fixed == 0 {
            be32(sizes, 12 + index * 4)?
        } else {
            fixed
        };
        let mut iv = [0u8; 16];
        iv[..8].copy_from_slice(&vectors[8 + index * 8..16 + index * 8]);
        output[write..write + size].copy_from_slice(&bytes[read..read + size]);
        AesCtr::new_from_slices(&key, &iv)
            .map_err(|_| "QISHUI_AUDIO_KEY_INVALID")?
            .apply_keystream(&mut output[write..write + size]);
        read += size;
        write += size;
    }
    if !flac {
        if let Some(index) = output[stsd.0..stsd.1]
            .windows(4)
            .position(|window| window == b"enca")
        {
            output[stsd.0 + index..stsd.0 + index + 4].copy_from_slice(b"mp4a");
        }
    }
    Ok((output, if flac { "audio/flac" } else { "audio/mp4" }.into()))
}
#[cfg(test)]
mod tests {
    use super::*;
    fn box_data(kind: &[u8], body: &[u8]) -> Vec<u8> {
        let mut output = ((body.len() + 8) as u32).to_be_bytes().to_vec();
        output.extend_from_slice(kind);
        output.extend_from_slice(body);
        output
    }
    #[test]
    fn decrypts_aac_samples_and_rejects_corrupt_counts() {
        let key = [0x11; 16];
        let iv = [0; 16];
        let mut encrypted = b"native audio sample".to_vec();
        AesCtr::new(&key.into(), &iv.into()).apply_keystream(&mut encrypted);
        let mut sizes = vec![0u8; 12];
        sizes[8..12].copy_from_slice(&1u32.to_be_bytes());
        sizes.extend_from_slice(&(encrypted.len() as u32).to_be_bytes());
        let mut vectors = vec![0u8; 16];
        vectors[4..8].copy_from_slice(&1u32.to_be_bytes());
        let mut table = box_data(b"stsd", b"enca");
        table.extend(box_data(b"stsz", &sizes));
        table.extend(box_data(b"senc", &vectors));
        let mut audio = box_data(
            b"moov",
            &box_data(
                b"trak",
                &box_data(b"mdia", &box_data(b"minf", &box_data(b"stbl", &table))),
            ),
        );
        audio.extend(box_data(b"mdat", &encrypted));
        let (plain, kind) = decrypt(&audio, &"11".repeat(16)).unwrap();
        assert_eq!(kind, "audio/mp4");
        assert!(plain.ends_with(b"native audio sample"));
        assert!(plain.windows(4).any(|v| v == b"mp4a"));
        assert!(decrypt(&audio, "bad key").is_err());
        let offset = audio.windows(4).position(|v| v == b"stsz").unwrap() + 4;
        audio[offset + 8..offset + 12].copy_from_slice(&u32::MAX.to_be_bytes());
        assert!(decrypt(&audio, &"11".repeat(16)).is_err());
    }
}
