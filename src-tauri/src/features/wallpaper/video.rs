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
use std::{path::Path, process::Stdio, time::Duration};
use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};

use crate::infrastructure::resources::ffmpeg;
pub async fn run(app: &AppHandle, args: &[String], progress: Option<&str>) -> Result<String> {
    let mut command = Command::new(ffmpeg(app));
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if let Some(pid) = child.id() {
        if let Err(error) = crate::infrastructure::child_process::contain(pid) {
            let _ = child.kill().await;
            return Err(error);
        }
    }
    let stderr = child.stderr.take().ok_or("FFmpeg stderr unavailable")?;
    let app = app.clone();
    let progress = progress.map(str::to_owned);
    let reader = tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        let mut output = String::new();
        while let Ok(Some(line)) = lines.next_line().await {
            if output.len() < 262144 {
                output.push_str(&line);
                output.push('\n');
            }
            if let Some(channel) = progress.as_ref() {
                let _ = app.emit(
                    "eisland-ipc",
                    json!({"channel":channel,"args":[{"stage":"processing","message":line}]}),
                );
            }
        }
        output
    });
    let status = tokio::time::timeout(Duration::from_secs(600), child.wait())
        .await
        .map_err(|_| "FFmpeg timed out".to_owned())?
        .map_err(|e| e.to_string())?;
    let output = reader.await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(output
            .chars()
            .rev()
            .take(4000)
            .collect::<String>()
            .chars()
            .rev()
            .collect());
    }
    Ok(output)
}
fn parse_probe(output: &str) -> Option<Value> {
    use regex::Regex;
    use std::sync::OnceLock;
    static EXPRESSIONS: OnceLock<[Regex; 6]> = OnceLock::new();
    let [input, duration, video, audio, dimensions, frames] = EXPRESSIONS.get_or_init(|| {
        [
            Regex::new(r"(?m)^Input #0, ([^\r\n]+), from ").unwrap(),
            Regex::new(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)").unwrap(),
            Regex::new(r"Video:\s*([a-zA-Z0-9_]+)").unwrap(),
            Regex::new(r"Audio:\s*([a-zA-Z0-9_]+)").unwrap(),
            Regex::new(r"(?:^|[, ]+)(\d{1,6})x(\d{1,6})(?:[ ,\[]|$)").unwrap(),
            Regex::new(r"(?:^|[, ]+)(\d+(?:\.\d+)?)(?:/(\d+))? fps").unwrap(),
        ]
    });
    let container = input
        .captures(output)?
        .get(1)?
        .as_str()
        .to_ascii_lowercase();
    let stream = output
        .lines()
        .find(|line| line.trim_start().starts_with("Stream #0:") && video.is_match(line));
    let dimensions = stream.and_then(|line| dimensions.captures(line));
    let frame_rate = stream
        .and_then(|line| frames.captures(line))
        .and_then(|frame| {
            let numerator = frame[1].parse::<f64>().ok()?;
            let denominator = frame.get(2).map_or(Some(1.), |denominator| {
                denominator.as_str().parse::<f64>().ok()
            })?;
            let rate = numerator / denominator;
            (rate.is_finite() && rate > 0.).then_some((rate * 1000.).round() / 1000.)
        });
    let duration_ms = duration
        .captures(output)
        .and_then(|duration| {
            let hours = duration[1].parse::<f64>().ok()?;
            let minutes = duration[2].parse::<f64>().ok()?;
            let seconds = duration[3].parse::<f64>().ok()?;
            let value = ((hours * 3600. + minutes * 60. + seconds) * 1000.).round();
            value.is_finite().then_some(value.max(1.))
        })
        .unwrap_or(0.);
    let video_codec = stream
        .and_then(|line| video.captures(line))
        .map(|value| value[1].to_ascii_lowercase());
    let audio_codec = output
        .lines()
        .filter(|line| line.trim_start().starts_with("Stream #0:"))
        .find_map(|line| audio.captures(line))
        .map(|value| value[1].to_ascii_lowercase());
    Some(
        json!({"width":dimensions.as_ref().and_then(|value|value[1].parse::<u32>().ok()).unwrap_or(0),"height":dimensions.as_ref().and_then(|value|value[2].parse::<u32>().ok()).unwrap_or(0),"durationMs":duration_ms,"frameRate":frame_rate,"videoCodec":video_codec,"audioCodec":audio_codec,"container":container}),
    )
}
async fn probe_binary(binary: &Path, path: &str) -> Result<Value> {
    use tokio::io::AsyncReadExt;
    let mut command = Command::new(binary);
    command
        .args(["-nostdin", "-hide_banner", "-i", path])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if let Some(pid) = child.id() {
        if let Err(error) = crate::infrastructure::child_process::contain(pid) {
            let _ = child.kill().await;
            return Err(error);
        }
    }
    let stderr = child
        .stderr
        .take()
        .ok_or("FFmpeg probe stderr unavailable")?;
    tokio::time::timeout(Duration::from_secs(15), async {
        let mut output = Vec::new();
        stderr
            .take(1024 * 1024 + 1)
            .read_to_end(&mut output)
            .await
            .map_err(|e| e.to_string())?;
        if output.len() > 1024 * 1024 {
            let _ = child.kill().await;
            return Err("FFmpeg probe output exceeds limit".to_owned());
        }
        // A probe without an output file intentionally exits nonzero after printing input metadata.
        child.wait().await.map_err(|e| e.to_string())?;
        Ok(parse_probe(&String::from_utf8_lossy(&output)).unwrap_or(Value::Null))
    })
    .await
    .map_err(|_| "Video probe timed out".to_owned())?
}
async fn probe(app: &AppHandle, path: &str) -> Result<Value> {
    if !Path::new(path).is_file() {
        return Err("Video file not found".into());
    }
    // Probe with the packaged native converter; no external ffprobe/PATH requirement.
    probe_binary(&ffmpeg(app), path).await
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
pub async fn extract(app: &AppHandle, options: &Value) -> Result<Value> {
    let input = options["filePath"]
        .as_str()
        .filter(|s| Path::new(s).is_file())
        .ok_or("Source file not found")?;
    let kind = options["trackType"].as_str().ok_or("Track type missing")?;
    if !["audio", "video"].contains(&kind) {
        return Err("Invalid track type".into());
    }
    let format = options["outputFormat"]
        .as_str()
        .ok_or("Output format missing")?;
    if ![
        "mp3", "aac", "wav", "flac", "ogg", "m4a", "mp4", "mkv", "webm", "mov", "avi",
    ]
    .contains(&format)
    {
        return Err("Unsupported output format".into());
    }
    let name = format!(
        "{}_{}.{}",
        Path::new(input)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy(),
        kind,
        format
    );
    let Some(output) = rfd::AsyncFileDialog::new()
        .set_file_name(&name)
        .save_file()
        .await
    else {
        return Ok(json!({"success":false,"error":"canceled"}));
    };
    let mut args = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        input.into(),
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
    }
    args.push(output.path().to_string_lossy().into_owned());
    match run(app, &args, None).await {
        Ok(_) => Ok(
            json!({"success":true,"outputPath":output.path(),"fileSize":std::fs::metadata(output.path()).ok().map(|m|m.len())}),
        ),
        Err(error) => Ok(json!({"success":false,"error":error})),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    #[test]
    fn packaged_ffmpeg_metadata_preserves_probe_contract() {
        let fixture = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'movie.mp4':\n  Duration: 01:02:03.45, start: 0.000000, bitrate: 1200 kb/s\n  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 29.97 fps, 30 tbr, 15360 tbn (default)\n  Stream #0:1(und): Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s (default)\nAt least one output file must be specified\n";
        assert_eq!(
            parse_probe(fixture).unwrap(),
            json!({"width":1920,"height":1080,"durationMs":3723450.,"frameRate":29.97,"videoCodec":"h264","audioCodec":"aac","container":"mov,mp4,m4a,3gp,3g2,mj2"})
        );
        assert_eq!(parse_probe("Input #0, matroska,webm, from 'silent.webm':\nDuration: N/A, start: 0.0\n Stream #0:0: Video: vp9 (Profile 0), yuv420p, 320x240, 30000/1001 fps\n").unwrap(), json!({"width":320,"height":240,"durationMs":0.,"frameRate":29.97,"videoCodec":"vp9","audioCodec":null,"container":"matroska,webm"}));
        assert!(parse_probe("Invalid data found when processing input").is_none());
        assert!(parse_probe("No such file or directory").is_none());
    }
    #[test]
    fn bundled_converter_probes_real_video_without_ffprobe() {
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
            eprintln!(
                "SKIP real FFmpeg probe: configure FFMPEG_BIN or build native FFmpeg resources"
            );
            return;
        };
        let file =
            std::env::temp_dir().join(format!("eisland-probe-{:032x}.mp4", rand::random::<u128>()));
        let mut command = std::process::Command::new(&binary);
        command
            .args([
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=64x48:r=25:d=0.2",
                "-c:v",
                "libx264",
            ])
            .arg(&file)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let output = command.output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let result = tauri::async_runtime::block_on(probe_binary(&binary, file.to_str().unwrap()));
        std::fs::remove_file(file).unwrap();
        let result = result.unwrap();
        assert_eq!(
            (result["width"].as_u64(), result["height"].as_u64()),
            (Some(64), Some(48))
        );
        assert_eq!(result["videoCodec"], "h264");
        assert_eq!(result["frameRate"], 25.);
        assert!(result["durationMs"].as_f64().unwrap() > 0.);
    }
}
