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

use super::{emit, failure, local_tool, now};
use crate::shared::Result;
use eventsource_stream::Eventsource;
use futures_util::{future::ready, Stream, StreamExt};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fmt::Display,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use tauri::AppHandle;

/// Decode SSE framing with the protocol library; retain the existing bounded model payload policy.
fn model_events<S, B, E>(source: S) -> impl Stream<Item = Result<Value>>
where
    S: Stream<Item = std::result::Result<B, E>>,
    B: AsRef<[u8]>,
    E: Display,
{
    const LIMIT: usize = 8 * 1024 * 1024;
    let pending = Arc::new(AtomicUsize::new(0));
    let buffered = pending.clone();
    source
        .map(move |bytes| {
            let bytes = bytes.map_err(|error| error.to_string())?;
            if buffered
                .fetch_add(bytes.as_ref().len(), Ordering::Relaxed)
                .saturating_add(bytes.as_ref().len())
                > LIMIT
            {
                return Err("Model stream event exceeds 8 MiB".to_owned());
            }
            Ok(bytes)
        })
        .eventsource()
        .take_while(|event| {
            ready(
                !event
                    .as_ref()
                    .is_ok_and(|event| event.data.trim() == "[DONE]"),
            )
        })
        .filter_map(move |event| {
            pending.store(0, Ordering::Relaxed);
            ready(match event {
                Ok(event) if event.data.trim().is_empty() => None,
                Ok(event) if event.data.len() > LIMIT => {
                    Some(Err("Model stream event exceeds 8 MiB".into()))
                }
                Ok(event) => Some(
                    serde_json::from_str(&event.data)
                        .map_err(|error| format!("Invalid model stream: {error}")),
                ),
                Err(error) => Some(Err(format!("Invalid model stream: {error}"))),
            })
        })
}
async fn response_json(mut response: reqwest::Response) -> Result<Value> {
    let bytes = crate::infrastructure::http::bounded(&mut response, 16 * 1024 * 1024).await?;
    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
}
fn endpoint(base: &str, path: &str) -> Result<reqwest::Url> {
    let base = reqwest::Url::parse(base).map_err(|e| e.to_string())?;
    if !matches!(base.scheme(), "http" | "https")
        || !base.username().is_empty()
        || base.password().is_some()
    {
        return Err("Invalid model API URL".into());
    }
    base.join(path).map_err(|e| e.to_string())
}
pub async fn ping(base: &str) -> bool {
    let Ok(url) = endpoint(base, "/") else {
        return false;
    };
    crate::infrastructure::http::client()
        .get(url)
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .is_ok_and(|r| r.status() == reqwest::StatusCode::OK)
}
pub async fn models(base: &str) -> Result<Value> {
    let response = crate::infrastructure::http::client()
        .get(endpoint(base, "/api/tags")?)
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    let value = response_json(response).await?;
    Ok(json!(value["models"]
        .as_array()
        .map(|items| items
            .iter()
            .filter_map(|item| item["name"].as_str())
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>())
        .unwrap_or_default()))
}
fn completions(base: &str) -> Result<reqwest::Url> {
    let trimmed = base.trim_end_matches('/');
    let value = if trimmed.ends_with("/chat/completions") {
        trimmed.to_owned()
    } else if trimmed.ends_with("/v1") {
        format!("{trimmed}/chat/completions")
    } else {
        format!("{trimmed}/v1/chat/completions")
    };
    endpoint(&value, "")
}
#[derive(Default)]
struct Envelope {
    source: String,
    forwarded: String,
}
impl Envelope {
    fn feed(&mut self, text: &str) -> String {
        self.source.push_str(text);
        let visible = answer_prefix(&self.source).unwrap_or_else(|| {
            if self.source.trim_start().starts_with('{') {
                String::new()
            } else {
                self.source.clone()
            }
        });
        let delta = visible
            .strip_prefix(&self.forwarded)
            .unwrap_or("")
            .to_owned();
        self.forwarded = visible;
        delta
    }
}
fn answer_prefix(source: &str) -> Option<String> {
    let start = source.find("\"answer\"")? + 8;
    let value = source[start..].trim_start().strip_prefix(':')?.trim_start();
    if !value.starts_with('"') {
        return None;
    }
    let mut escaped = false;
    for (index, ch) in value.char_indices().skip(1) {
        if ch == '"' && !escaped {
            return serde_json::from_str(&value[..index + 1]).ok();
        }
        escaped = ch == '\\' && !escaped;
    }
    let mut candidate = value.to_owned();
    for _ in 0..16 {
        if let Ok(result) = serde_json::from_str::<String>(&format!("{candidate}\"")) {
            return Some(result);
        }
        if candidate.len() <= 1 {
            break;
        }
        candidate.pop();
    }
    Some(String::new())
}
#[derive(Default)]
struct Thinking {
    pending: String,
    inside: bool,
    index: u64,
}
impl Thinking {
    fn feed(&mut self, text: &str, flush: bool) -> Vec<(bool, String, u64)> {
        self.pending.push_str(text);
        let mut output = Vec::new();
        loop {
            let marker = if self.inside { "</think>" } else { "<think>" };
            if let Some(index) = self.pending.find(marker) {
                if index > 0 {
                    output.push((self.inside, self.pending[..index].to_owned(), self.index));
                }
                self.pending = self.pending[index + marker.len()..].to_owned();
                self.inside = !self.inside;
                if self.inside {
                    self.index += 1;
                }
                continue;
            }
            let hold = if flush {
                0
            } else {
                (1..marker.len())
                    .rev()
                    .find(|length| self.pending.ends_with(&marker[..*length]))
                    .unwrap_or(0)
            };
            let end = self.pending.len() - hold;
            if end > 0 {
                output.push((self.inside, self.pending[..end].to_owned(), self.index));
                self.pending = self.pending[end..].to_owned();
            }
            break;
        }
        output
    }
}
fn event(app: &AppHandle, owner: &str, channel: &str, kind: &str, payload: Value) -> Result<()> {
    emit(app, owner, channel, json!({"type":kind,"payload":payload}))
}
fn process_chunk(
    app: &AppHandle,
    owner: &str,
    channel: &str,
    chunk: &Value,
    state: (&mut Envelope, &mut Thinking, &mut usize, &mut Value),
) -> Result<()> {
    let (envelope, thinking, full, usage) = state;
    if let Some(error) = chunk.get("error").filter(|value| !value.is_null()) {
        return Err(error["message"]
            .as_str()
            .unwrap_or("Model provider returned an error")
            .to_owned());
    }
    if chunk["usage"].is_object() {
        *usage = chunk["usage"].clone();
    }
    let delta = &chunk["choices"][0]["delta"];
    if let Some(reasoning) = delta["reasoning_content"]
        .as_str()
        .or_else(|| delta["reasoning"].as_str())
    {
        event(
            app,
            owner,
            channel,
            "think",
            json!({"text":reasoning,"index":thinking.index}),
        )?;
    }
    let text = delta["content"]
        .as_str()
        .or_else(|| chunk["choices"][0]["message"]["content"].as_str())
        .unwrap_or("");
    *full = full.saturating_add(text.len()).saturating_add(
        delta["reasoning_content"]
            .as_str()
            .or_else(|| delta["reasoning"].as_str())
            .unwrap_or("")
            .len(),
    );
    if *full > 8 * 1024 * 1024 {
        return Err("Model response exceeds 8 MiB".into());
    }
    for (inside, text, index) in thinking.feed(text, false) {
        if inside {
            event(
                app,
                owner,
                channel,
                "think",
                json!({"text":text,"index":index}),
            )?;
        } else {
            let clean = envelope.feed(&text);
            if !clean.is_empty() {
                event(app, owner, channel, "chunk", json!({"text":clean}))?;
            }
        }
    }
    Ok(())
}
async fn turn(
    app: &AppHandle,
    owner: &str,
    channel: &str,
    request: &Value,
    prompt: &str,
    ollama: bool,
) -> Result<(String, Value, Envelope)> {
    let base = match request["baseUrl"].as_str().filter(|s| !s.is_empty()) {
        Some(base) => base,
        None if ollama => "http://localhost:11434",
        None => return Err("Custom model base URL is required".into()),
    };
    let url = if ollama {
        endpoint(base, "/v1/chat/completions")?
    } else {
        completions(base)?
    };
    let mut body = json!({"model":request["model"],"messages":[{"role":"system","content":request["systemPrompt"].as_str().unwrap_or("")},{"role":"user","content":prompt}],"stream":true,"stream_options":{"include_usage":true}});
    if request["temperature"].is_number() {
        body["temperature"] = request["temperature"].clone();
    }
    let mut builder = crate::infrastructure::http::client()
        .post(url)
        .timeout(Duration::from_secs(120))
        .header("Accept", "text/event-stream")
        .json(&body);
    if !ollama {
        if let Some(key) = request["apiKey"].as_str().filter(|s| !s.is_empty()) {
            builder = builder.bearer_auth(key);
        }
    }
    let response = builder.send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Model request failed: HTTP {}", response.status()));
    }
    let sse = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("text/event-stream"));
    let mut envelope = Envelope::default();
    let mut thinking = Thinking::default();
    let mut full = 0usize;
    let mut usage = Value::Null;
    if !sse {
        let chunk = response_json(response).await?;
        process_chunk(
            app,
            owner,
            channel,
            &chunk,
            (&mut envelope, &mut thinking, &mut full, &mut usage),
        )?;
    } else {
        let stream = model_events(response.bytes_stream());
        futures_util::pin_mut!(stream);
        while let Some(chunk) = stream.next().await {
            process_chunk(
                app,
                owner,
                channel,
                &chunk?,
                (&mut envelope, &mut thinking, &mut full, &mut usage),
            )?;
        }
    }

    for (inside, text, index) in thinking.feed("", true) {
        if inside {
            event(
                app,
                owner,
                channel,
                "think",
                json!({"text":text,"index":index}),
            )?;
        } else {
            let clean = envelope.feed(&text);
            if !clean.is_empty() {
                event(app, owner, channel, "chunk", json!({"text":clean}))?;
            }
        }
    }
    Ok((envelope.source.clone(), usage, envelope))
}
pub async fn run(
    app: &AppHandle,
    owner: &str,
    channel: &str,
    request: &Value,
    ollama: bool,
) -> Result<()> {
    if request["model"]
        .as_str()
        .is_none_or(|v| v.trim().is_empty())
    {
        return Err("Model is required".into());
    }
    let provider = if ollama { "ollama" } else { "custom-direct" };
    let agent = if ollama {
        "mihtnelis agent (local)"
    } else {
        "mihtnelis agent (direct)"
    };
    event(
        app,
        owner,
        channel,
        "meta",
        json!({"agent":agent,"provider":provider,"model":request["model"],"timestamp":chrono::Utc::now().to_rfc3339(),"thinkingEnabled":true}),
    )?;
    event(
        app,
        owner,
        channel,
        "status",
        json!({"phase":"orchestrating","message":"正在处理中…"}),
    )?;
    let mut scratch = String::new();
    let mut input = 0;
    let mut output = 0;
    let mut api_tokens = false;
    let mut cache: HashMap<String, (Value, usize, bool)> = HashMap::new();
    let mut revision = 0;
    let mut repeats = 0;
    for index in 1..=15 {
        let prompt=format!("对话上下文:\n{}\n\n用户问题:\n{}\n\n{}\n只允许输出一个 JSON 对象。请按内部思考框架决策后输出 tool_call 或 final。禁止输出其他文本。",request["context"].as_str().unwrap_or(""),request["userMessage"].as_str().unwrap_or(""),scratch);
        let (source, usage, envelope) = turn(app, owner, channel, request, &prompt, ollama).await?;
        if usage.is_object() {
            api_tokens = true;
            input += usage["prompt_tokens"].as_u64().unwrap_or(0);
            output += usage["completion_tokens"].as_u64().unwrap_or(0);
        }
        let parsed = source
            .find('{')
            .zip(source.rfind('}'))
            .filter(|(start, end)| end > start)
            .and_then(|(start, end)| serde_json::from_str::<Value>(&source[start..=end]).ok());
        if parsed.as_ref().is_some_and(|v| {
            v["type"]
                .as_str()
                .is_some_and(|s| s.eq_ignore_ascii_case("tool_call"))
        }) {
            let call = parsed.unwrap();
            let tool = call["tool"].as_str().unwrap_or("").trim().to_lowercase();
            let arguments = call["arguments"].clone();
            if !envelope.forwarded.trim().is_empty() {
                event(app, owner, channel, "stream_rollback", json!({}))?;
            }
            let signature = format!("{tool}:{arguments}");
            let previous = cache
                .get(&signature)
                .filter(|(_, cached_revision, one_shot)| *cached_revision == revision || *one_shot)
                .map(|(value, _, _)| value.clone());
            let result = if let Some(result) = previous {
                repeats += 1;
                result
            } else {
                repeats = 0;
                event(
                    app,
                    owner,
                    channel,
                    "tool_call_request",
                    json!({"turn":index,"tool":tool,"purpose":call["purpose"],"arguments":arguments,"riskLevel":"local"}),
                )?;
                let result = if tool == "web.search" {
                    web_search(request["token"].as_str().unwrap_or(""), &arguments).await
                } else {
                    local_tool(app,&json!({"tool":tool,"arguments":arguments,"workspaces":request["workspaces"]})).await
                };
                event(
                    app,
                    owner,
                    channel,
                    "tool_call_result",
                    json!({"turn":index,"tool":tool,"success":result["success"],"result":result["result"],"error":result["error"],"durationMs":result["durationMs"]}),
                )?;
                let read_only = [
                    "get", "read", "list", "stat", "exists", "search", "query", "status", "lookup",
                    "tree", "grep", "hash", "now", "cpu", "memory", "disk", "gpu", "ping", "dns",
                    "ports",
                ]
                .iter()
                .any(|part| tool.split('.').any(|piece| piece == *part));
                let one_shot = tool.starts_with("cmd.")
                    || [
                        "create",
                        "delete",
                        "trash",
                        "toggle",
                        "rename",
                        "restart",
                        "shutdown",
                        "sleep",
                        "send",
                        "close",
                        "append",
                        "add",
                        "move",
                        "copy",
                        "install",
                        "uninstall",
                        "start",
                        "stop",
                        "write",
                    ]
                    .contains(&tool.rsplit('.').next().unwrap_or(""));
                if result["success"] == true && !read_only {
                    revision += 1;
                }
                cache.insert(
                    signature,
                    (
                        result.clone(),
                        revision,
                        one_shot || result["success"] != true,
                    ),
                );
                result
            };
            if repeats >= 2 {
                break;
            }
            let observation=json!({"tool":tool,"success":result["success"],"data":result["result"],"error":result["error"]}).to_string();
            scratch.push_str(&format!(
                "\n\nTurn {index}:\nAction: {tool}\nAction Input: {}\nObservation: {}",
                arguments.to_string().chars().take(1200).collect::<String>(),
                observation.chars().take(8000).collect::<String>()
            ));
            continue;
        }
        let answer = parsed
            .as_ref()
            .and_then(|v| v["answer"].as_str())
            .unwrap_or(&source);
        if envelope.forwarded.trim() != answer.trim() && !answer.is_empty() {
            event(app, owner, channel, "stream_rollback", json!({}))?;
            event(app, owner, channel, "chunk", json!({"text":answer}))?;
        }
        return event(
            app,
            owner,
            channel,
            "final",
            json!({"done":true,"agent":agent,"provider":provider,"model":request["model"],"billedInputTokens":input,"billedOutputTokens":output,"billedTokenTotal":input+output,"tokenSource":if api_tokens{"api"}else{"estimate"}}),
        );
    }
    event(
        app,
        owner,
        channel,
        "error",
        json!({"code":"TOOL_LOOP_LIMIT","message":"Tool execution stopped because no progress was made or the turn limit was reached"}),
    )
}
async fn web_search(token: &str, args: &Value) -> Value {
    let started = Instant::now();
    if token.trim().is_empty() {
        return failure("Authentication required for web.search", 0);
    }
    let query = args["query"]
        .as_str()
        .or_else(|| args["q"].as_str())
        .unwrap_or("")
        .trim();
    if query.is_empty() || query.chars().count() > 500 {
        return failure("web.search query must contain 1 to 500 characters", 0);
    }
    let result = async {
        let base = if cfg!(debug_assertions) {
            "https://test.server.pyisland.com/api"
        } else {
            "https://server.pyisland.com/api"
        };
        let response = crate::infrastructure::http::client()
            .post(format!("{base}/v1/user/ai/agent/search"))
            .timeout(Duration::from_secs(20))
            .bearer_auth(token.trim())
            .header("X-App-Name", "eisland")
            .header("X-Client-Version", env!("CARGO_PKG_VERSION"))
            .header("X-Timestamp", now().to_string())
            .header("X-Nonce", uuid::Uuid::new_v4().to_string())
            .json(&json!({"query":query,"limit":args["limit"].as_u64().unwrap_or(5).clamp(1,10)}))
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?;
        let response = response_json(response).await?;
        if response["success"] != true
            || response["data"]["provider"] != "searxng"
            || !response["data"]["results"].is_array()
        {
            return Err("Invalid SearXNG search response".to_owned());
        }
        Ok(response["data"].clone())
    }
    .await;
    match result {
        Ok(value) => {
            json!({"success":true,"result":value,"error":"","durationMs":started.elapsed().as_millis()})
        }
        Err(error) => failure(&error, started.elapsed().as_millis()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn sse_library_handles_all_network_splits_crlf_multiline_empty_and_done_events() {
        let wire = concat!(
            ": heartbeat\r\n\r\n",
            "data: {\r\ndata: \"choices\": [{\"delta\":{\"content\":\"中文😀\"}}]}\r\n\r\n",
            "data:\r\n\r\n",
            "data: [DONE]\r\n\r\n",
            "data: invalid-after-done\n\n"
        )
        .as_bytes();
        for split in 0..=wire.len() {
            let chunks = vec![
                Ok::<_, std::io::Error>(wire[..split].to_vec()),
                Ok(wire[split..].to_vec()),
            ];
            let events = model_events(futures_util::stream::iter(chunks))
                .collect::<Vec<_>>()
                .await;
            assert_eq!(events.len(), 1, "split={split}: {events:?}");
            assert_eq!(
                events[0].as_ref().unwrap()["choices"][0]["delta"]["content"],
                "中文😀"
            );
        }
    }
    #[tokio::test]
    async fn sse_library_reports_transport_json_utf8_and_size_errors_without_silent_loss() {
        for chunks in [
            vec![Err(std::io::Error::new(
                std::io::ErrorKind::ConnectionReset,
                "fixture interrupted",
            ))],
            vec![Ok(b"data: invalid-json\n\n".to_vec())],
            vec![Ok(vec![
                b'd', b'a', b't', b'a', b':', b' ', 0xff, b'\n', b'\n',
            ])],
            vec![Ok(vec![b'x'; 8 * 1024 * 1024 + 1])],
        ] {
            let events = model_events(futures_util::stream::iter(chunks))
                .collect::<Vec<_>>()
                .await;
            assert!(events.iter().any(|event| event.is_err()), "{events:?}");
        }
        let interrupted = vec![Ok::<_, std::io::Error>(b"data: {\"choices\":[]}".to_vec())];
        assert!(
            model_events(futures_util::stream::iter(interrupted))
                .collect::<Vec<_>>()
                .await
                .is_empty(),
            "unterminated SSE records must not be dispatched"
        );
    }
    #[test]
    fn model_url_retains_configured_prefix() {
        assert_eq!(
            completions("https://api.example/v1/").unwrap().as_str(),
            "https://api.example/v1/chat/completions"
        );
        assert!(completions("file:///secret").is_err());
    }
    #[test]
    fn streamed_json_answer_decodes_escaped_unicode_without_exposing_envelope() {
        let mut f = Envelope::default();
        assert_eq!(f.feed("{\"type\":\"final\",\"ans"), "");
        assert_eq!(f.feed("wer\":\"a\\n\\u4f60"), "a\n你");
        assert_eq!(f.feed("好\"}"), "好");
    }
    #[test]
    fn partial_thinking_markers_are_not_forwarded_as_answer() {
        let mut p = Thinking::default();
        assert_eq!(p.feed("<thi", false).len(), 0);
        assert_eq!(
            p.feed("nk>reason</th", false),
            vec![(true, "reason".into(), 1)]
        );
        assert_eq!(
            p.feed("ink>answer", true),
            vec![(false, "answer".into(), 1)]
        );
    }
}
