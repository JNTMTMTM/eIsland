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

//! Native screenshot text recognition and image-translation clients.
use crate::windows::Result;
use base64::{engine::general_purpose::STANDARD, Engine};
use futures_util::StreamExt;
use reqwest::{header::HeaderMap, multipart, Client, Response};
use serde_json::{json, Value};
use std::{
    future::Future,
    io::Cursor,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const IMAGE_LIMIT: usize = 10 * 1024 * 1024;
const RESPONSE_LIMIT: usize = 32 * 1024 * 1024;
struct CaptureImage {
    bytes: Vec<u8>,
    mime: String,
}
fn failure(code: &str) -> Value {
    json!({"success":false,"code":code})
}
fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value[key].as_str().unwrap_or("")
}
fn image_data(raw: &str) -> std::result::Result<CaptureImage, &'static str> {
    let (metadata, encoded) = raw.split_once(',').ok_or("invalidData")?;
    let mime = metadata
        .strip_prefix("data:")
        .and_then(|v| v.strip_suffix(";base64"))
        .ok_or("invalidData")?
        .to_ascii_lowercase();
    if !matches!(
        mime.as_str(),
        "image/png" | "image/jpeg" | "image/bmp" | "image/gif" | "image/tiff" | "image/webp"
    ) || encoded.is_empty()
    {
        return Err("invalidData");
    }
    if encoded.len() > IMAGE_LIMIT.div_ceil(3) * 4 {
        return Err("imageTooLarge");
    }
    let bytes = STANDARD.decode(encoded).map_err(|_| "invalidData")?;
    if bytes.len() > IMAGE_LIMIT {
        return Err("imageTooLarge");
    }
    let dimensions = image::ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .map_err(|_| "invalidData")?
        .into_dimensions()
        .map_err(|_| "invalidData")?;
    let (w, h) = dimensions;
    if w < 15
        || h < 15
        || w > 8192
        || h > 8192
        || f64::from(w) / f64::from(h) >= 50.
        || f64::from(h) / f64::from(w) >= 50.
    {
        return Err("imageUnsupportedDimensions");
    }
    Ok(CaptureImage { bytes, mime })
}
fn base_url() -> &'static str {
    if cfg!(debug_assertions) {
        "https://test.server.pyisland.com/api"
    } else {
        "https://server.pyisland.com/api"
    }
}
fn headers(app: &AppHandle, token: &str) -> Result<HeaderMap> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string();
    let nonce = uuid::Uuid::new_v4().to_string();
    let version = app.package_info().version.to_string();
    let mut headers = HeaderMap::new();
    for (name, value) in [
        ("authorization", format!("Bearer {token}")),
        ("x-app-name", "eisland".into()),
        ("x-client-version", version),
        ("x-timestamp", now),
        ("x-nonce", nonce),
        ("x-static-asset-node", "r2".into()),
    ] {
        headers.insert(
            reqwest::header::HeaderName::from_bytes(name.as_bytes()).map_err(|e| e.to_string())?,
            value
                .parse()
                .map_err(|_| "Invalid authentication header".to_owned())?,
        );
    }
    Ok(headers)
}
async fn bounded(response: Response, limit: usize) -> Result<Vec<u8>> {
    if response
        .content_length()
        .is_some_and(|size| size > limit as u64)
    {
        return Err("Response exceeds limit".into());
    }
    let mut stream = response.bytes_stream();
    let mut bytes = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        if chunk.len() > limit.saturating_sub(bytes.len()) {
            return Err("Response exceeds limit".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}
async fn json_response(response: Response) -> Result<(bool, Value)> {
    let success = response.status().is_success();
    let bytes = bounded(response, 1024 * 1024).await?;
    Ok((
        success,
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())?,
    ))
}
async fn while_capture<T>(
    app: &AppHandle,
    task: impl Future<Output = T>,
) -> std::result::Result<T, ()> {
    let closed = async {
        loop {
            if app.get_webview_window("capture").is_none() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    };
    tokio::select! { value=task=>Ok(value), _=closed=>Err(()) }
}
async fn online_ocr(
    app: &AppHandle,
    client: &Client,
    token: &str,
    image: CaptureImage,
) -> Result<Value> {
    let part = multipart::Part::bytes(image.bytes)
        .file_name("capture.png")
        .mime_str(&image.mime)
        .map_err(|e| e.to_string())?;
    let response = client
        .post(format!("{}/v1/toolbox/ocr", base_url()))
        .headers(headers(app, token)?)
        .multipart(multipart::Form::new().part("image", part))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let (ok, payload) = json_response(response).await?;
    if ok && payload["code"] == 200 && payload["data"].is_object() {
        return Ok(
            json!({"success":true,"text":text(&payload["data"],"text"),"requestId":payload["data"]["requestId"]}),
        );
    }
    Ok(
        json!({"success":false,"code":payload["errorCode"].as_str().unwrap_or("ocrFailed"),"message":payload["message"]}),
    )
}
async fn translate(
    app: &AppHandle,
    client: &Client,
    token: &str,
    image: CaptureImage,
    payload: &Value,
) -> Result<Value> {
    let part = multipart::Part::bytes(image.bytes)
        .file_name("capture-translate.png")
        .mime_str(&image.mime)
        .map_err(|e| e.to_string())?;
    let source = if text(payload, "sourceLanguage").is_empty() {
        "auto"
    } else {
        text(payload, "sourceLanguage")
    };
    let target = if text(payload, "targetLanguage").is_empty() {
        "zh"
    } else {
        text(payload, "targetLanguage")
    };
    let form = multipart::Form::new()
        .part("file", part)
        .text("sourceLanguage", source.to_owned())
        .text("targetLanguage", target.to_owned());
    let response = client
        .post(format!("{}/v1/toolbox/image-translations", base_url()))
        .headers(headers(app, token)?)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let (ok, payload) = json_response(response).await?;
    let task_id = text(&payload["data"], "taskId");
    if !ok || task_id.is_empty() {
        return Ok(failure("submitFailed"));
    }
    let mut url = reqwest::Url::parse(&format!("{}/v1/toolbox/image-translations/", base_url()))
        .map_err(|e| e.to_string())?;
    url.path_segments_mut()
        .map_err(|_| "Invalid task URL")?
        .pop_if_empty()
        .push(task_id);
    for count in 0..80 {
        tokio::time::sleep(Duration::from_millis(1500)).await;
        let response = client
            .get(url.clone())
            .headers(headers(app, token)?)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let (ok, result) = json_response(response).await?;
        if !ok || !result["data"].is_object() {
            if count < 2 {
                continue;
            }
            return Ok(failure("queryFailed"));
        }
        match text(&result["data"], "status") {
            "FAILED" => return Ok(failure("translationFailed")),
            "SUCCEEDED" => {
                let raw = text(&result["data"], "resultUrl");
                if raw.is_empty() {
                    return Ok(failure("noResultUrl"));
                }
                if raw.starts_with("data:image/") {
                    return Ok(json!({"success":true,"translatedImage":raw}));
                }
                let url = reqwest::Url::parse(raw).map_err(|e| e.to_string())?;
                if !matches!(url.scheme(), "http" | "https") {
                    return Ok(failure("translationFailed"));
                }
                let response = client.get(url).send().await.map_err(|e| e.to_string())?;
                if !response.status().is_success() {
                    return Ok(failure("translationFailed"));
                }
                let mime = response
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("image/png")
                    .split(';')
                    .next()
                    .unwrap_or("image/png")
                    .to_owned();
                if !mime.starts_with("image/") {
                    return Ok(failure("translationFailed"));
                }
                let bytes = bounded(response, RESPONSE_LIMIT).await?;
                return Ok(
                    json!({"success":true,"translatedImage":format!("data:{mime};base64,{}",STANDARD.encode(bytes))}),
                );
            }
            _ => {}
        }
    }
    Ok(failure("timeout"))
}
#[cfg(windows)]
fn local_ocr(bytes: &[u8]) -> Result<String> {
    use windows::{
        Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap},
        Media::Ocr::OcrEngine,
        Storage::Streams::DataWriter,
        Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
    };
    // Tokio blocking workers have no apartment affinity; initialize WinRT for this call.
    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|e| e.to_string())?;
    struct Apartment;
    impl Drop for Apartment {
        fn drop(&mut self) {
            unsafe {
                RoUninitialize();
            }
        }
    }
    let _apartment = Apartment;
    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| e.to_string())?;
    let image = image::load_from_memory(bytes).map_err(|e| e.to_string())?;
    let limit = OcrEngine::MaxImageDimension().map_err(|e| e.to_string())?;
    let image = if image.width() > limit || image.height() > limit {
        image.resize(limit, limit, image::imageops::FilterType::Lanczos3)
    } else {
        image
    };
    let (w, h) = (image.width(), image.height());
    let mut pixels = image.to_rgba8().into_raw();
    pixels
        .as_chunks_mut::<4>()
        .0
        .iter_mut()
        .for_each(|pixel| pixel.swap(0, 2));
    let writer = DataWriter::new().map_err(|e| e.to_string())?;
    writer.WriteBytes(&pixels).map_err(|e| e.to_string())?;
    let buffer = writer.DetachBuffer().map_err(|e| e.to_string())?;
    let bitmap =
        SoftwareBitmap::CreateCopyFromBuffer(&buffer, BitmapPixelFormat::Bgra8, w as i32, h as i32)
            .map_err(|e| e.to_string())?;
    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;
    let lines = result.Lines().map_err(|e| e.to_string())?;
    let mut text = Vec::new();
    for line in lines {
        text.push(line.Text().map_err(|e| e.to_string())?.to_string());
    }
    Ok(text.join("\n"))
}
#[cfg(not(windows))]
fn local_ocr(_bytes: &[u8]) -> Result<String> {
    Err("Local OCR requires Windows OCR language packs".into())
}
pub fn handles(channel: &str) -> bool {
    matches!(
        channel,
        "capture-ocr" | "capture-ocr-local" | "capture-translate"
    )
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    if app.get_webview_window("capture").is_none() {
        return Ok(failure("captureWindowClosed"));
    }
    let payload = args.first().unwrap_or(&Value::Null);
    let token = text(payload, "token").trim();
    if channel != "capture-ocr-local" && token.is_empty() {
        return Ok(failure(if channel == "capture-translate" {
            "loginRequired"
        } else {
            "ocrLoginRequired"
        }));
    }
    let image = match image_data(text(payload, "dataURL")) {
        Ok(image) => image,
        Err(code) => return Ok(failure(code)),
    };
    let result = if channel == "capture-ocr-local" {
        let job = tauri::async_runtime::spawn_blocking(move || local_ocr(&image.bytes));
        match while_capture(app, job).await {
            Ok(Ok(Ok(text))) => Ok(json!({"success":true,"text":text})),
            Err(()) => Ok(failure("ocrTimeout")),
            other => {
                eprintln!("[OCR] Native recognition failed: {other:?}");
                Ok(failure("ocrFailed"))
            }
        }
    } else {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| e.to_string())?;
        if channel == "capture-translate" {
            while_capture(app, translate(app, &client, token, image, payload))
                .await
                .unwrap_or_else(|_| Ok(failure("aborted")))
        } else {
            while_capture(app, online_ocr(app, &client, token, image))
                .await
                .unwrap_or_else(|_| Ok(failure("ocrTimeout")))
        }
    };
    match result {
        Ok(value) => Ok(value),
        Err(error) => {
            eprintln!("[Capture] {channel} failed: {error}");
            Ok(failure(if channel == "capture-translate" {
                "translationFailed"
            } else {
                "ocrFailed"
            }))
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn data(w: u32, h: u32) -> String {
        let image = image::DynamicImage::new_rgba8(w, h);
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        format!(
            "data:image/png;base64,{}",
            STANDARD.encode(bytes.into_inner())
        )
    }
    #[test]
    fn accepts_real_screenshot_dimensions() {
        assert!(image_data(&data(32, 32)).is_ok());
    }
    #[test]
    fn rejects_invalid_encodings_and_mime() {
        for value in [
            "data:text/plain;base64,Zm9v",
            "data:image/png;base64,not-base64",
            "data:image/png;base64,",
        ] {
            assert!(matches!(image_data(value), Err("invalidData")));
        }
    }
    #[test]
    fn checks_dimensions_before_recognition() {
        assert!(matches!(
            image_data(&data(14, 32)),
            Err("imageUnsupportedDimensions")
        ));
        assert!(matches!(
            image_data(&data(750, 15)),
            Err("imageUnsupportedDimensions")
        ));
    }
}
