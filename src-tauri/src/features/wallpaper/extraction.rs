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

//! Audio/video track extraction core; selection and native processor are explicit boundaries.
use crate::shared::Result;
use serde_json::{json, Value};
use std::{
    future::Future,
    path::{Path, PathBuf},
};

fn arguments(input: &Path, kind: &str, format: &str, output: &Path) -> Vec<String> {
    let mut args = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        input.to_string_lossy().into_owned(),
    ];
    if kind == "audio" {
        args.extend(
            [
                "-vn",
                "-c:a",
                match format {
                    "mp3" => "libmp3lame",
                    "aac" | "m4a" => "aac",
                    "wav" => "pcm_s16le",
                    "flac" => "flac",
                    "ogg" => "libvorbis",
                    _ => "copy",
                },
            ]
            .map(str::to_owned),
        );
        match format {
            "mp3" => args.extend(["-q:a", "0"].map(str::to_owned)),
            "aac" | "m4a" => args.extend(["-b:a", "320k"].map(str::to_owned)),
            "ogg" => args.extend(["-q:a", "6"].map(str::to_owned)),
            _ => {}
        }
    } else {
        args.extend(
            [
                "-an",
                "-c:v",
                if format == "webm" {
                    "libvpx-vp9"
                } else {
                    "copy"
                },
            ]
            .map(str::to_owned),
        );
        if format == "mp4" {
            args.extend(["-movflags", "+faststart"].map(str::to_owned));
        }
    }
    args.push(output.to_string_lossy().into_owned());
    args
}
fn failure(message: impl Into<String>) -> Value {
    json!({"success":false,"error":message.into()})
}

/// Run the production extraction workflow without making a GUI dialog part of the processor.
/// Only an affirmative selector result supplies the output path; no native IPC bypass exists.
pub(super) async fn extract_with<P, PF, R, RF>(options: &Value, choose: P, execute: R) -> Value
where
    P: FnOnce(PathBuf, String) -> PF,
    PF: Future<Output = Option<PathBuf>>,
    R: FnOnce(Vec<String>) -> RF,
    RF: Future<Output = Result<String>>,
{
    let Some(input) = options["filePath"]
        .as_str()
        .map(Path::new)
        .filter(|path| path.is_file())
    else {
        return failure("Source file not found");
    };
    let Some(kind) = options["trackType"]
        .as_str()
        .filter(|kind| ["audio", "video"].contains(kind))
    else {
        return failure("Invalid track type");
    };
    let Some(format) = options["outputFormat"].as_str().filter(|format| {
        [
            "mp3", "aac", "wav", "flac", "ogg", "m4a", "mp4", "mkv", "webm", "mov", "avi",
        ]
        .contains(format)
    }) else {
        return failure("Unsupported output format");
    };
    let name = format!(
        "{}_{}.{}",
        input.file_stem().unwrap_or_default().to_string_lossy(),
        kind,
        format
    );
    let suggested = input.with_file_name(name);
    let Some(output) = choose(suggested, format.to_owned()).await else {
        return failure("canceled");
    };
    if input
        .canonicalize()
        .ok()
        .zip(output.canonicalize().ok())
        .is_some_and(|(input, output)| input == output)
    {
        return failure("Output cannot replace the source file");
    }
    let Some(parent) = output.parent().filter(|path| path.is_dir()) else {
        return failure("Output directory does not exist");
    };
    let Some(extension) = output.extension().and_then(|value| value.to_str()) else {
        return failure("Output filename requires an extension");
    };
    // Stage beside the selected destination. Failed or cancelled processing cannot truncate a
    // pre-existing destination; replacing it occurs only after the native processor succeeds.
    let temporary = parent.join(format!(
        ".eisland-extract-{}.{}",
        uuid::Uuid::new_v4(),
        extension
    ));
    let result = execute(arguments(input, kind, format, &temporary)).await;
    let info = std::fs::metadata(&temporary)
        .ok()
        .filter(|info| info.is_file() && info.len() > 0);
    if let Err(error) = result {
        let _ = std::fs::remove_file(&temporary);
        return failure(error);
    }
    let Some(info) = info else {
        let _ = std::fs::remove_file(&temporary);
        return failure("FFmpeg produced no output");
    };
    if let Err(error) = std::fs::rename(&temporary, &output) {
        let _ = std::fs::remove_file(&temporary);
        return failure(error.to_string());
    }
    json!({"success":true,"outputPath":output,"fileSize":info.len()})
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path =
                std::env::temp_dir().join(format!("eisland-extract-test-{}", uuid::Uuid::new_v4()));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn input(&self) -> PathBuf {
            let input = self.0.join("source.mp4");
            std::fs::write(&input, b"source fixture").unwrap();
            input
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            std::fs::remove_dir_all(&self.0).unwrap();
        }
    }
    fn options(input: &Path, kind: &str, format: &str) -> Value {
        json!({"filePath":input,"trackType":kind,"outputFormat":format})
    }
    #[test]
    fn supported_formats_select_real_codecs_and_track_suppression() {
        for (format, codec) in [
            ("mp3", "libmp3lame"),
            ("aac", "aac"),
            ("m4a", "aac"),
            ("wav", "pcm_s16le"),
            ("flac", "flac"),
            ("ogg", "libvorbis"),
            ("mp4", "copy"),
        ] {
            let args = arguments(Path::new("input"), "audio", format, Path::new("output"));
            assert!(args.iter().any(|arg| arg == "-vn"));
            assert_eq!(
                args[args.iter().position(|arg| arg == "-c:a").unwrap() + 1],
                codec
            );
        }
        let args = arguments(Path::new("input"), "video", "webm", Path::new("output"));
        assert!(args.iter().any(|arg| arg == "-an"));
        assert!(args.iter().any(|arg| arg == "libvpx-vp9"));
        assert!(
            arguments(Path::new("input"), "video", "mp4", Path::new("output"))
                .iter()
                .any(|arg| arg == "+faststart")
        );
    }
    #[test]
    fn invalid_requests_and_dialog_cancellation_never_start_processing() {
        let fixture = Fixture::new();
        let input = fixture.input();
        tauri::async_runtime::block_on(async {
            for request in [
                Value::Null,
                options(&input, "other", "wav"),
                options(&input, "audio", "exe"),
            ] {
                let result = extract_with(
                    &request,
                    |_, _| async { panic!("invalid requests must not open a dialog") },
                    |_| async { panic!("invalid request executed") },
                )
                .await;
                assert_eq!(result["success"], false);
            }
            let result = extract_with(
                &options(&input, "audio", "wav"),
                |suggested, format| async move {
                    assert_eq!(suggested.file_name().unwrap(), "source_audio.wav");
                    assert_eq!(format, "wav");
                    None
                },
                |_| async { panic!("cancelled extraction executed") },
            )
            .await;
            assert_eq!(result["error"], "canceled");
        });
    }
    #[test]
    fn failed_processing_preserves_existing_destination_and_removes_only_staging() {
        let fixture = Fixture::new();
        let input = fixture.input();
        let output = fixture.0.join("audio.wav");
        std::fs::write(&output, b"existing user destination").unwrap();
        tauri::async_runtime::block_on(async {
            let result = extract_with(
                &options(&input, "audio", "wav"),
                |_, _| async { Some(output.clone()) },
                |args| async move {
                    std::fs::write(args.last().unwrap(), b"partial").unwrap();
                    Err("fixture FFmpeg failure".into())
                },
            )
            .await;
            assert_eq!(result["success"], false);
            assert_eq!(
                std::fs::read(&output).unwrap(),
                b"existing user destination"
            );
            assert_eq!(std::fs::read_dir(&fixture.0).unwrap().count(), 2);
            let result = extract_with(
                &options(&input, "audio", "wav"),
                |_, _| async { Some(input.clone()) },
                |_| async { panic!("source overwrite must be rejected") },
            )
            .await;
            assert_eq!(result["success"], false);
            let result = extract_with(
                &options(&input, "audio", "wav"),
                |_, _| async { Some(output.clone()) },
                |_| async { Ok(String::new()) },
            )
            .await;
            assert_eq!(result["error"], "FFmpeg produced no output");
        });
    }
    #[test]
    fn native_processor_extracts_real_audio_and_video_to_selected_fixture_paths() {
        let name = if cfg!(windows) {
            "ffmpeg.exe"
        } else {
            "ffmpeg"
        };
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let binary = [
            std::env::var_os("FFMPEG_BIN").map(PathBuf::from),
            Some(root.join("resources/native/ffmpeg").join(name)),
            Some(root.join("../node_modules/ffmpeg-static").join(name)),
        ]
        .into_iter()
        .flatten()
        .find(|path| path.is_file());
        let Some(binary) = binary else {
            eprintln!("SKIP real extraction: configure FFMPEG_BIN or build native resources");
            return;
        };
        let fixture = Fixture::new();
        let input = fixture.0.join("source.mp4");
        tauri::async_runtime::block_on(async {
            let args = [
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=blue:s=64x48:r=10:d=0.4",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=440:duration=0.4",
                "-shortest",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                input.to_str().unwrap(),
            ]
            .map(str::to_owned);
            super::super::video::run_binary(&binary, &args, None)
                .await
                .unwrap();
            for (kind, format) in [("audio", "wav"), ("video", "mp4")] {
                let output = fixture.0.join(format!("selected-{kind}.{format}"));
                let result = extract_with(
                    &options(&input, kind, format),
                    |_, _| async { Some(output.clone()) },
                    |args| {
                        let binary = &binary;
                        async move { super::super::video::run_binary(binary, &args, None).await }
                    },
                )
                .await;
                assert_eq!(result["success"], true, "{}", result);
                assert!(std::fs::metadata(&output).unwrap().len() > 0);
                let parsed = super::super::video::probe_binary(
                    &std::env::var_os("FFPROBE_BIN")
                        .map(PathBuf::from)
                        .unwrap_or_else(|| {
                            root.join("resources/native/ffmpeg").join(if cfg!(windows) {
                                "ffprobe.exe"
                            } else {
                                "ffprobe"
                            })
                        }),
                    output.to_str().unwrap(),
                )
                .await
                .unwrap();
                if kind == "audio" {
                    assert_eq!(parsed["audioCodec"], "pcm_s16le");
                    assert!(parsed["videoCodec"].is_null());
                } else {
                    assert_eq!(parsed["videoCodec"], "h264");
                    assert!(parsed["audioCodec"].is_null());
                }
            }
        });
    }
}
