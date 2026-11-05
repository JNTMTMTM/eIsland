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

use super::Music;
use crate::shared::Result;
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};
use tiny_http::{Header, Request, Response, StatusCode};
use tokio::sync::{oneshot, watch};

use super::decrypt;
const AUDIO_LIMIT: usize = 128 * 1024 * 1024;
const CACHE_LIMIT: u64 = 256 * 1024 * 1024;
type Replies = Mutex<HashMap<String, oneshot::Sender<Result<Value>>>>;
struct AudioEntry {
    source: String,
    key: String,
    expires: Instant,
    file: Option<PathBuf>,
    kind: String,
    length: u64,
}
pub(crate) struct LocalServer {
    pub base: String,
    prefix: String,
    assets: PathBuf,
    directory: PathBuf,
    replies: Replies,
    sequence: AtomicU64,
    entries: Mutex<HashMap<String, AudioEntry>>,
    loading: Mutex<()>,
}
fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name, value).expect("Invalid static HTTP header")
}
fn reply(request: Request, code: u16, body: &str) {
    let _ = request.respond(
        Response::from_string(body)
            .with_status_code(code)
            .with_header(header("Access-Control-Allow-Origin", "*")),
    );
}

impl LocalServer {
    pub(crate) fn start(app: &AppHandle, shutdown: watch::Receiver<bool>) -> Result<Arc<Self>> {
        let server = tiny_http::Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
        let secret = format!(
            "{:032x}{:032x}",
            rand::random::<u128>(),
            rand::random::<u128>()
        );
        let base = format!("http://{}/{secret}/", server.server_addr());
        let assets = crate::infrastructure::resources::browser_assets(
            app,
            "qishui-auth-v6",
            "security_host.html",
        )?;
        let directory = app
            .path()
            .app_cache_dir()
            .map_err(|e| e.to_string())?
            .join(format!("music-audio-{}-{secret}", std::process::id()));
        std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let state = Arc::new(Self {
            base,
            prefix: format!("/{secret}/"),
            assets,
            directory,
            replies: Mutex::new(HashMap::new()),
            sequence: AtomicU64::new(1),
            entries: Mutex::new(HashMap::new()),
            loading: Mutex::new(()),
        });
        let state_loop = state.clone();
        std::thread::Builder::new()
            .name("music-http".into())
            .spawn(move || {
                let Ok(client) = reqwest::blocking::Client::builder()
                    .timeout(Duration::from_secs(30))
                    .redirect(reqwest::redirect::Policy::limited(10))
                    .build()
                else {
                    return;
                };
                let active = Arc::new(AtomicUsize::new(0));
                while !*shutdown.borrow() {
                    state_loop.prune();
                    match server.recv_timeout(Duration::from_millis(250)) {
                        Ok(Some(request)) => {
                            if active.fetch_add(1, Ordering::AcqRel) >= 16 {
                                active.fetch_sub(1, Ordering::AcqRel);
                                reply(request, 503, "Busy");
                                continue;
                            }
                            let state = state_loop.clone();
                            let client = client.clone();
                            let active = active.clone();
                            std::thread::spawn(move || {
                                state.serve(request, &client);
                                active.fetch_sub(1, Ordering::AcqRel);
                            });
                        }
                        Ok(None) => {}
                        Err(_) => break,
                    }
                }
                state_loop
                    .replies
                    .lock()
                    .unwrap()
                    .drain()
                    .for_each(|(_, sender)| {
                        let _ = sender.send(Err("Music service stopped".into()));
                    });
            })
            .map_err(|e| e.to_string())?;
        Ok(state)
    }
    fn prune(&self) {
        let now = Instant::now();
        self.entries.lock().unwrap().retain(|_, entry| {
            if entry.expires > now {
                return true;
            }
            if let Some(file) = &entry.file {
                let _ = std::fs::remove_file(file);
            }
            false
        });
    }
    pub(crate) fn register(&self, source: &str, key: &str) -> Result<String> {
        let url = reqwest::Url::parse(source).map_err(|_| "QISHUI_AUDIO_URL_INVALID")?;
        if url.scheme() != "https" {
            return Err("QISHUI_AUDIO_URL_INVALID".into());
        }
        self.prune();
        let mut entries = self.entries.lock().unwrap();
        while entries.len() >= 32 {
            let oldest = entries
                .iter()
                .min_by_key(|(_, entry)| entry.expires)
                .map(|(key, _)| key.clone())
                .unwrap();
            if let Some(entry) = entries.remove(&oldest) {
                if let Some(file) = entry.file {
                    let _ = std::fs::remove_file(file);
                }
            }
        }
        let token = format!("{:032x}", rand::random::<u128>());
        entries.insert(
            token.clone(),
            AudioEntry {
                source: url.to_string(),
                key: key.to_owned(),
                expires: Instant::now() + Duration::from_secs(300),
                file: None,
                kind: String::new(),
                length: 0,
            },
        );
        Ok(format!("{}audio/{token}", self.base))
    }
    pub(crate) async fn evaluate(
        &self,
        music: &Music,
        app: &AppHandle,
        script: &str,
    ) -> Result<Value> {
        // Audio URLs expose the server's base to the renderer. Each privileged browser
        // evaluation therefore needs its own unguessable response capability.
        let id = format!(
            "{}-{:032x}",
            self.sequence.fetch_add(1, Ordering::Relaxed),
            rand::random::<u128>()
        );
        let (sender, receiver) = oneshot::channel();
        self.replies.lock().unwrap().insert(id.clone(), sender);
        let args =
            serde_json::json!({"script":script,"callbackUrl":format!("{}reply/{id}",self.base)});
        if let Err(error) = music.window.handle(app, "eval", &args).await {
            self.replies.lock().unwrap().remove(&id);
            return Err(error);
        }
        let result = tokio::time::timeout(Duration::from_secs(300), receiver).await;
        self.replies.lock().unwrap().remove(&id);
        result
            .map_err(|_| "Music browser evaluation timed out")?
            .map_err(|_| "Music browser evaluation closed")?
    }
    fn serve(&self, mut request: Request, client: &reqwest::blocking::Client) {
        let Some(path) = request.url().strip_prefix(&self.prefix).map(str::to_owned) else {
            reply(request, 404, "Not Found");
            return;
        };
        if let Some(id) = path
            .strip_prefix("reply/")
            .filter(|id| id.len() <= 64 && id.bytes().all(|c| c.is_ascii_hexdigit() || c == b'-'))
        {
            if request.method().as_str() != "POST" {
                reply(request, 405, "Method Not Allowed");
                return;
            }
            let mut bytes = Vec::new();
            let _ = request
                .as_reader()
                .take(8 * 1024 * 1024 + 1)
                .read_to_end(&mut bytes);
            if bytes.len() > 8 * 1024 * 1024 {
                reply(request, 413, "Too Large");
                return;
            }
            let Ok(value) = serde_json::from_slice::<Value>(&bytes) else {
                reply(request, 400, "Invalid JSON");
                return;
            };
            if let Some(sender) = self.replies.lock().unwrap().remove(id) {
                let result = value["error"]
                    .as_str()
                    .map_or_else(|| Ok(value.clone()), |error| Err(error.to_owned()));
                let _ = sender.send(result);
                reply(request, 200, "ok");
            } else {
                reply(request, 404, "Not Found");
            }
            return;
        }
        if let Some(token) = path.strip_prefix("audio/") {
            self.serve_audio(request, client, token);
            return;
        }
        if !matches!(request.method().as_str(), "GET" | "HEAD") {
            reply(request, 405, "Method Not Allowed");
            return;
        }
        let kind = match path.as_str() {
            "security_seed.html" | "security_host.html" => "text/html; charset=utf-8",
            "react.js" | "react-dom.js" | "sdk-glue.js" | "bdms.js" => {
                "text/javascript; charset=utf-8"
            }
            _ => {
                reply(request, 404, "Not Found");
                return;
            }
        };
        match File::open(self.assets.join(path)) {
            Ok(file) => {
                let _ = request.respond(
                    Response::from_file(file)
                        .with_header(header("Content-Type", kind))
                        .with_header(header("Cache-Control", "no-store"))
                        .with_header(header("X-Content-Type-Options", "nosniff")),
                );
            }
            Err(_) => reply(request, 500, "Missing authentication asset"),
        }
    }
    fn serve_audio(&self, request: Request, client: &reqwest::blocking::Client, token: &str) {
        if !matches!(request.method().as_str(), "GET" | "HEAD") {
            reply(request, 405, "Method Not Allowed");
            return;
        }
        let range = request
            .headers()
            .iter()
            .find(|h| h.field.equiv("Range"))
            .map(|h| h.value.as_str().to_owned());
        let head = request.method().as_str() == "HEAD";
        let metadata = self
            .entries
            .lock()
            .unwrap()
            .get(token)
            .filter(|entry| entry.expires > Instant::now())
            .map(|entry| (entry.source.clone(), entry.key.clone(), entry.file.clone()));
        let Some((source, key, cached)) = metadata else {
            reply(request, 404, "Not Found");
            return;
        };
        if cached.is_none() && key.is_empty() {
            let mut get = if head {
                client.head(&source)
            } else {
                client.get(&source)
            };
            if let Some(range) = &range {
                get = get.header("Range", range);
            }
            let upstream = match get.send() {
                Ok(value) if value.status().is_success() => value,
                _ => {
                    reply(request, 502, "Bad Gateway");
                    return;
                }
            };
            if range.is_none() || upstream.status().as_u16() == 206 || head {
                let length = upstream_length(&upstream, head);
                let kind = upstream
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("audio/mp4")
                    .to_owned();
                let mut headers = vec![
                    header("Content-Type", &kind),
                    header("Access-Control-Allow-Origin", "*"),
                ];
                for name in ["accept-ranges", "content-range"] {
                    if let Some(value) = upstream.headers().get(name).and_then(|v| v.to_str().ok())
                    {
                        headers.push(header(name, value));
                    }
                }
                let status = StatusCode(upstream.status().as_u16());
                let _ = request.respond(Response::new(status, headers, upstream, length, None));
                return;
            }
            let _guard = self.loading.lock().unwrap();
            if let Err(error) = self.cache(token, &key, upstream) {
                reply(request, 502, &error);
                return;
            }
        } else if cached.is_none() {
            let _guard = self.loading.lock().unwrap();
            let loaded = self
                .entries
                .lock()
                .unwrap()
                .get(token)
                .is_some_and(|entry| entry.file.is_some());
            if !loaded {
                match client.get(&source).send() {
                    Ok(value) if value.status().is_success() => {
                        if let Err(error) = self.cache(token, &key, value) {
                            reply(request, 502, &error);
                            return;
                        }
                    }
                    _ => {
                        reply(request, 502, "Bad Gateway");
                        return;
                    }
                }
            }
        }
        let metadata = self.entries.lock().unwrap().get(token).and_then(|entry| {
            entry
                .file
                .as_ref()
                .map(|file| (file.clone(), entry.kind.clone(), entry.length))
        });
        let Some((file, kind, length)) = metadata else {
            reply(request, 404, "Not Found");
            return;
        };
        let (start, end) = match byte_range(range.as_deref(), length) {
            Ok(value) => value,
            Err(_) => {
                let _ = request.respond(
                    Response::empty(416)
                        .with_header(header("Content-Range", &format!("bytes */{length}"))),
                );
                return;
            }
        };
        let Ok(mut file) = File::open(file) else {
            reply(request, 404, "Not Found");
            return;
        };
        if file.seek(SeekFrom::Start(start)).is_err() {
            reply(request, 502, "Cache error");
            return;
        }
        let mut headers = vec![
            header("Content-Type", &kind),
            header("Accept-Ranges", "bytes"),
            header("Access-Control-Allow-Origin", "*"),
        ];
        if range.is_some() {
            headers.push(header(
                "Content-Range",
                &format!("bytes {start}-{end}/{length}"),
            ));
        }
        let _ = request.respond(Response::new(
            StatusCode(if range.is_some() { 206 } else { 200 }),
            headers,
            file.take(end - start + 1),
            Some((end - start + 1) as usize),
            None,
        ));
    }
    fn cache(
        &self,
        token: &str,
        key: &str,
        mut response: reqwest::blocking::Response,
    ) -> Result<()> {
        if self
            .entries
            .lock()
            .unwrap()
            .get(token)
            .is_some_and(|entry| entry.file.is_some())
        {
            return Ok(());
        }
        if response
            .content_length()
            .is_some_and(|length| length > AUDIO_LIMIT as u64)
        {
            return Err("QISHUI_AUDIO_TOO_LARGE".into());
        }
        let kind = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("audio/mp4")
            .to_owned();
        let mut buffer = Vec::new();
        response
            .by_ref()
            .take(AUDIO_LIMIT as u64 + 1)
            .read_to_end(&mut buffer)
            .map_err(|e| e.to_string())?;
        if buffer.len() > AUDIO_LIMIT {
            return Err("QISHUI_AUDIO_TOO_LARGE".into());
        }
        let (buffer, kind) = if key.is_empty() {
            (buffer, kind)
        } else {
            decrypt::decrypt(&buffer, key)?
        };
        let mut entries = self.entries.lock().unwrap();
        if !entries.contains_key(token) {
            return Err("Audio source expired".into());
        }
        let mut total =
            entries.values().map(|entry| entry.length).sum::<u64>() + buffer.len() as u64;
        let mut evict = entries
            .iter()
            .filter(|(id, entry)| id.as_str() != token && entry.file.is_some())
            .map(|(id, entry)| (id.clone(), entry.expires))
            .collect::<Vec<_>>();
        evict.sort_by_key(|(_, expires)| *expires);
        for (id, _) in evict {
            if total <= CACHE_LIMIT {
                break;
            }
            if let Some(entry) = entries.get_mut(&id) {
                if let Some(file) = entry.file.take() {
                    let _ = std::fs::remove_file(file);
                }
                total = total.saturating_sub(entry.length);
                entry.length = 0;
            }
        }
        let file = self.directory.join(format!("{token}.audio"));
        std::fs::write(&file, &buffer).map_err(|e| e.to_string())?;
        let entry = entries.get_mut(token).unwrap();
        entry.file = Some(file);
        entry.length = buffer.len() as u64;
        entry.kind = kind;
        Ok(())
    }
}
impl Drop for LocalServer {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}
fn upstream_length(response: &reqwest::blocking::Response, head: bool) -> Option<usize> {
    // HEAD has an empty HTTP body; its representation length is only in the header.
    let length = if head {
        response
            .headers()
            .get(reqwest::header::CONTENT_LENGTH)?
            .to_str()
            .ok()?
            .parse::<u64>()
            .ok()?
    } else {
        response.content_length()?
    };
    usize::try_from(length).ok()
}
fn byte_range(raw: Option<&str>, length: u64) -> Result<(u64, u64)> {
    if length == 0 {
        return Err("Empty audio".into());
    }
    let Some(raw) = raw else {
        return Ok((0, length - 1));
    };
    let Some((start, end)) = raw
        .strip_prefix("bytes=")
        .and_then(|value| value.split_once('-'))
    else {
        return Err("Invalid range".into());
    };
    let start = if start.is_empty() {
        length.saturating_sub(end.parse::<u64>().map_err(|_| "Invalid range")?)
    } else {
        start.parse::<u64>().map_err(|_| "Invalid range")?
    };
    let end = if raw.starts_with("bytes=-") || end.is_empty() {
        length - 1
    } else {
        end.parse::<u64>()
            .map_err(|_| "Invalid range")?
            .min(length - 1)
    };
    if start > end || start >= length {
        return Err("Invalid range".into());
    }
    Ok((start, end))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ranges_cover_closed_open_suffix_and_invalid_requests() {
        assert_eq!(byte_range(Some("bytes=1-3"), 8).unwrap(), (1, 3));
        assert_eq!(byte_range(Some("bytes=-2"), 8).unwrap(), (6, 7));
        assert_eq!(byte_range(Some("bytes=5-"), 8).unwrap(), (5, 7));
        assert!(byte_range(Some("bytes=9-"), 8).is_err());
        assert!(byte_range(Some("bytes=0-1,3-4"), 8).is_err());
    }
    #[test]
    fn audio_head_uses_representation_length_instead_of_empty_body_length() {
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let url = format!("http://{}/audio", server.server_addr());
        let worker = std::thread::spawn(move || {
            let request = server.recv().unwrap();
            request
                .respond(tiny_http::Response::from_data(b"abcdefgh".to_vec()))
                .unwrap();
        });
        let response = reqwest::blocking::Client::new().head(url).send().unwrap();
        assert_eq!(response.content_length(), Some(0));
        assert_eq!(upstream_length(&response, true), Some(8));
        worker.join().unwrap();
    }
}
