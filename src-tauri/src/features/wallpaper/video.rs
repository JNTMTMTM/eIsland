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

use crate::shared::Result;
use serde_json::{json, Value};
use std::{path::Path, time::Duration};
use tauri::{AppHandle, Emitter};

use crate::infrastructure::child_process;
use crate::infrastructure::resources::{ffmpeg, ffprobe};
pub async fn run(app: &AppHandle, args: &[String], progress: Option<&str>) -> Result<String> {
    run_binary(
        &ffmpeg(app),
        args,
        progress.map(|channel| (app.clone(), channel.to_owned())),
    )
    .await
}
/// Execute the packaged native processor with bounded lifetime and an optional UI progress sink.
pub(super) async fn run_binary(
    binary: &Path,
    args: &[String],
    progress: Option<(AppHandle, String)>,
) -> Result<String> {
    let mut command = child_process::command(binary);
    command.args(args);
    let options = child_process::Options {
        timeout: Duration::from_secs(600),
        stdout_limit: 65536,
        stderr_limit: 262144,
        managed: true,
        check_exit: false,
    };
    let output = child_process::run_with_stderr_lines(command, options, move |line| {
        if let Some((app, channel)) = progress.as_ref() {
            let _ = app.emit(
                "eisland-ipc",
                json!({"channel":channel,"args":[{"stage":"processing","message":line}]}),
            );
        }
    })
    .await?;
    if output.status.success() {
        Ok(output.stderr_text())
    } else {
        Err(last_error(&output.stderr_text()))
    }
}

fn last_error(output: &str) -> String {
    output
        .chars()
        .rev()
        .take(4000)
        .collect::<String>()
        .chars()
        .rev()
        .collect()
}

#[derive(serde::Deserialize)]
struct Probe {
    #[serde(default)]
    streams: Vec<ProbeStream>,
    format: Option<ProbeFormat>,
}
#[derive(serde::Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    duration: Option<String>,
    avg_frame_rate: Option<String>,
    r_frame_rate: Option<String>,
    disposition: Option<ProbeDisposition>,
}
#[derive(serde::Deserialize)]
struct ProbeDisposition {
    attached_pic: Option<u8>,
}
#[derive(serde::Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
    format_name: Option<String>,
}
fn positive_number(value: &str) -> Option<f64> {
    value
        .parse::<f64>()
        .ok()
        .filter(|value| value.is_finite() && *value >= 0.)
}
fn frame_rate(value: &str) -> Option<f64> {
    let rate = if let Some((numerator, denominator)) = value.split_once('/') {
        let denominator = positive_number(denominator)?;
        if denominator == 0. {
            return None;
        }
        positive_number(numerator)? / denominator
    } else {
        positive_number(value)?
    };
    (rate > 0. && rate.is_finite()).then_some((rate * 1000.).round() / 1000.)
}
fn parse_probe(output: &[u8]) -> Result<Value> {
    let probe: Probe =
        serde_json::from_slice(output).map_err(|e| format!("Invalid ffprobe JSON: {e}"))?;
    if probe.format.is_none() && probe.streams.is_empty() {
        return Err("ffprobe metadata missing".into());
    }
    let video = probe.streams.iter().find(|stream| {
        stream.codec_type.as_deref() == Some("video")
            && !stream
                .disposition
                .as_ref()
                .is_some_and(|value| value.attached_pic == Some(1))
    });
    let audio = probe
        .streams
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("audio"));
    let duration = probe
        .format
        .as_ref()
        .and_then(|format| format.duration.as_deref())
        .and_then(positive_number)
        .or_else(|| {
            probe
                .streams
                .iter()
                .filter_map(|stream| stream.duration.as_deref().and_then(positive_number))
                .reduce(f64::max)
        })
        .unwrap_or(0.);
    let rate = video.and_then(|stream| {
        stream
            .avg_frame_rate
            .as_deref()
            .and_then(frame_rate)
            .or_else(|| stream.r_frame_rate.as_deref().and_then(frame_rate))
    });
    Ok(
        json!({"width":video.and_then(|stream|stream.width).unwrap_or(0),"height":video.and_then(|stream|stream.height).unwrap_or(0),"durationMs":(duration*1000.).round(),"frameRate":rate,"videoCodec":video.and_then(|stream|stream.codec_name.as_deref()),"audioCodec":audio.and_then(|stream|stream.codec_name.as_deref()),"container":probe.format.and_then(|format|format.format_name).map(|value|value.to_ascii_lowercase())}),
    )
}

/// Probe the bundled ffprobe binary using its stable machine-readable JSON format.
pub(super) async fn probe_binary(binary: &Path, path: &str) -> Result<Value> {
    let mut command = child_process::command(binary);
    command.args([
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        path,
    ]);
    let output = child_process::run(
        command,
        child_process::Options {
            timeout: Duration::from_secs(15),
            stdout_limit: 1024 * 1024,
            stderr_limit: 65536,
            managed: true,
            check_exit: false,
        },
    )
    .await?;
    if !output.status.success() {
        return Err(format!(
            "ffprobe failed: {}",
            last_error(&output.stderr_text())
        ));
    }
    parse_probe(&output.stdout)
}

async fn probe(app: &AppHandle, path: &str) -> Result<Value> {
    if !Path::new(path).is_file() {
        return Err("Video file not found".into());
    }
    probe_binary(&ffprobe(app)?, path).await
}
pub async fn handle(app: &AppHandle, channel: &str, a: &Value) -> Result<Value> {
    let directory = crate::infrastructure::storage::data_dir(app).join("wallpapers");
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    if channel == "wallpaper:video:clear-cache" {
        for file in std::fs::read_dir(&directory)
            .map_err(|e| e.to_string())?
            .flatten()
        {
            if file.file_type().is_ok_and(|t| t.is_file())
                && file.file_name().to_string_lossy().starts_with("video-")
            {
                std::fs::remove_file(file.path()).map_err(|e| e.to_string())?;
            }
        }
        return Ok(Value::Null);
    }
    let path = if channel == "wallpaper:video:prepare" {
        a["sourcePath"].as_str()
    } else {
        a.as_str()
    }
    .ok_or("Video source missing")?;
    if channel == "wallpaper:video:probe" {
        return probe(app, path).await;
    }
    let token = format!(
        "video-{}-{}",
        crate::shared::time::now_ms(),
        rand::random::<u64>()
    );
    let cover = directory.join(format!("{token}.jpg"));
    if channel == "wallpaper:video:cover" {
        run(
            app,
            &[
                "-y",
                "-hide_banner",
                "-i",
                path,
                "-frames:v",
                "1",
                cover.to_string_lossy().as_ref(),
            ]
            .map(str::to_owned),
            None,
        )
        .await?;
        return Ok(json!(cover));
    }
    let probe = probe(app, path).await.unwrap_or(Value::Null);
    let target = directory.join(format!("{token}.mp4"));
    let progress = a["progressChannel"].as_str();
    let remux = a["preferRemux"] != false
        && probe["videoCodec"] == "h264"
        && (probe["audioCodec"].is_null() || probe["audioCodec"] == "aac");
    let mut mode = if remux { "remux" } else { "transcode" };
    let arguments = |remux: bool| {
        let mut args = vec!["-y".into(), "-hide_banner".into(), "-i".into(), path.into()];
        if remux {
            args.extend(["-c", "copy"].map(str::to_owned));
        } else {
            args.extend(
                [
                    "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-c:a", "aac",
                ]
                .map(str::to_owned),
            );
        }
        args.extend([
            "-movflags".into(),
            "+faststart".into(),
            target.to_string_lossy().into_owned(),
        ]);
        args
    };
    let mut available = run(app, &arguments(remux), progress).await;
    if remux && available.is_err() {
        mode = "transcode";
        available = run(app, &arguments(false), progress).await;
    }
    let (mode, ffmpeg_available) = match available {
        Ok(_) => (mode, true),
        Err(error)
            if error.contains("not find")
                || error.contains("No such file")
                || error.contains("系统找不到") =>
        {
            std::fs::copy(path, &target).map_err(|e| e.to_string())?;
            ("copy", false)
        }
        Err(error) => {
            return Ok(
                json!({"ok":false,"playbackPath":null,"coverPath":null,"message":error,"ffmpegAvailable":true,"mode":mode,"width":0,"height":0,"durationMs":0,"frameRate":null,"videoCodec":null,"audioCodec":null,"container":null}),
            )
        }
    };
    let cover_ok = if ffmpeg_available {
        run(
            app,
            &[
                "-y",
                "-hide_banner",
                "-i",
                target.to_string_lossy().as_ref(),
                "-frames:v",
                "1",
                cover.to_string_lossy().as_ref(),
            ]
            .map(str::to_owned),
            None,
        )
        .await
        .is_ok()
    } else {
        false
    };
    if let Some(channel) = progress {
        let _ = app.emit(
            "eisland-ipc",
            json!({"channel":channel,"args":[{"stage":"done","percent":100}]}),
        );
    }
    Ok(
        json!({"ok":true,"playbackPath":target,"coverPath":if cover_ok{Some(cover)}else{None},"width":probe["width"].as_u64().unwrap_or(0),"height":probe["height"].as_u64().unwrap_or(0),"durationMs":probe["durationMs"].as_f64().unwrap_or(0.),"frameRate":probe["frameRate"],"videoCodec":probe["videoCodec"],"audioCodec":probe["audioCodec"],"container":probe["container"],"mode":mode,"ffmpegAvailable":ffmpeg_available}),
    )
}
/// Keep native file selection at the UI boundary; processing and cancellation are independently tested.
pub async fn extract(app: &AppHandle, options: &Value) -> Result<Value> {
    let binary = ffmpeg(app);
    Ok(super::extraction::extract_with(
        options,
        |suggested, format| async move {
            rfd::AsyncFileDialog::new()
                .set_file_name(suggested.file_name().unwrap_or_default().to_string_lossy())
                .set_directory(suggested.parent().unwrap_or_else(|| Path::new(".")))
                .add_filter(format.to_uppercase(), &[format])
                .save_file()
                .await
                .map(|file| file.path().to_path_buf())
        },
        |args| async move { run_binary(&binary, &args, None).await },
    )
    .await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    #[test]
    fn ffprobe_json_preserves_duration_dimensions_rates_codecs_and_silent_contract() {
        let fixture=br#"{"format":{"duration":"3723.45","format_name":"mov,mp4,m4a,3gp,3g2,mj2"},"streams":[{"codec_type":"video","codec_name":"h264","width":1920,"height":1080,"avg_frame_rate":"30000/1001"},{"codec_type":"audio","codec_name":"aac"}]}"#;
        assert_eq!(
            parse_probe(fixture).unwrap(),
            json!({"width":1920,"height":1080,"durationMs":3723450.,"frameRate":29.97,"videoCodec":"h264","audioCodec":"aac","container":"mov,mp4,m4a,3gp,3g2,mj2"})
        );
        let silent=br#"{"format":{"duration":"N/A","format_name":"matroska,webm"},"streams":[{"codec_type":"video","codec_name":"vp9","width":320,"height":240,"duration":"2.5","avg_frame_rate":"0/0","r_frame_rate":"30000/1001"}]}"#;
        assert_eq!(
            parse_probe(silent).unwrap(),
            json!({"width":320,"height":240,"durationMs":2500.,"frameRate":29.97,"videoCodec":"vp9","audioCodec":null,"container":"matroska,webm"})
        );
        assert!(parse_probe(b"not JSON").is_err());
        assert!(parse_probe(b"{}").is_err());
        for invalid in ["0/0", "NaN", "inf", "-1", "10/0", "x/2"] {
            assert!(frame_rate(invalid).is_none());
        }
        assert_eq!(frame_rate("25"), Some(25.));
        let cover=br#"{"format":{"format_name":"mp3"},"streams":[{"codec_type":"video","codec_name":"mjpeg","width":100,"height":100,"disposition":{"attached_pic":1}},{"codec_type":"audio","codec_name":"mp3","duration":"1"}]}"#;
        let value = parse_probe(cover).unwrap();
        assert_eq!(value["videoCodec"], Value::Null);
        assert_eq!(value["width"], 0);
        assert_eq!(value["durationMs"], 1000.);
        let unknown = parse_probe(br#"{"streams":[{"codec_type":"video"}]}"#).unwrap();
        assert_eq!(unknown["height"], 0);
        assert_eq!(unknown["frameRate"], Value::Null);
        assert_eq!(unknown["container"], Value::Null);
    }
    #[test]
    fn bundled_ffprobe_probes_real_video_audio_and_missing_sources() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/native/ffmpeg");
        let extension = if cfg!(windows) { ".exe" } else { "" };
        let converter = std::env::var_os("FFMPEG_BIN")
            .map(PathBuf::from)
            .unwrap_or_else(|| root.join(format!("ffmpeg{extension}")));
        let probe = std::env::var_os("FFPROBE_BIN")
            .map(PathBuf::from)
            .unwrap_or_else(|| root.join(format!("ffprobe{extension}")));
        assert!(
            converter.is_file(),
            "Prepare bundled FFmpeg resources before native tests"
        );
        assert!(
            probe.is_file(),
            "Prepare bundled ffprobe resources before native tests"
        );
        let directory =
            std::env::temp_dir().join(format!("eisland-ffprobe-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        tauri::async_runtime::block_on(async {
            for audio in [false, true] {
                let file = directory.join(if audio {
                    "with-audio.mp4"
                } else {
                    "silent.mp4"
                });
                let mut command = child_process::command(&converter);
                command.args([
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=c=black:s=64x48:r=25:d=0.2",
                ]);
                if audio {
                    command.args([
                        "-f",
                        "lavfi",
                        "-i",
                        "sine=frequency=440:duration=0.2",
                        "-c:a",
                        "aac",
                    ]);
                }
                command
                    .args(["-c:v", "libx264", "-pix_fmt", "yuv420p"])
                    .arg(&file);
                child_process::run(
                    command,
                    child_process::Options {
                        managed: true,
                        ..Default::default()
                    },
                )
                .await
                .unwrap();
                let result = probe_binary(&probe, file.to_str().unwrap()).await.unwrap();
                assert_eq!(result["width"], 64);
                assert_eq!(result["height"], 48);
                assert_eq!(result["videoCodec"], "h264");
                assert_eq!(result["frameRate"], 25.);
                assert!(result["durationMs"].as_f64().unwrap() >= 160.);
                assert_eq!(
                    result["audioCodec"],
                    if audio { json!("aac") } else { Value::Null }
                );
            }
            assert!(
                probe_binary(&probe, directory.join("missing.mp4").to_str().unwrap())
                    .await
                    .is_err()
            );
        });
        std::fs::remove_dir_all(directory).unwrap();
    }
}
