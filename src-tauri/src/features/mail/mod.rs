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

//! Native IMAP inbox and on-demand MIME body access; attachments are never fetched.
use crate::shared::Result;
use crate::state::Desktop;
use imap::{types::Fetch, Client};
use imap_proto::types::{Address, BodyStructure, MessageSection, SectionPath};
use serde_json::{json, Value};
use std::{
    collections::VecDeque,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    sync::{Arc, LazyLock, Mutex},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};

const TIMEOUT: Duration = Duration::from_secs(15);
const BODY_LIMIT: usize = 32 * 1024 * 1024;
const CACHE_LIMIT: usize = 8 * 1024 * 1024;
static SLOTS: LazyLock<Arc<tokio::sync::Semaphore>> =
    LazyLock::new(|| Arc::new(tokio::sync::Semaphore::new(8)));
static DETAILS: LazyLock<tokio::sync::Mutex<()>> = LazyLock::new(|| tokio::sync::Mutex::new(()));
static CACHE: LazyLock<Mutex<VecDeque<(String, Value, usize)>>> =
    LazyLock::new(|| Mutex::new(VecDeque::new()));
#[derive(Clone)]
struct Account {
    host: String,
    port: u16,
    secure: bool,
    user: String,
    secret: String,
}
fn account(raw: &Value) -> Result<Account> {
    let host = raw["imapHost"].as_str().unwrap_or("").trim().to_owned();
    let user = raw["authUser"].as_str().unwrap_or("").trim().to_owned();
    let secret = raw["authSecret"].as_str().unwrap_or("").to_owned();
    if host.is_empty() {
        return Err("IMAP server is required".into());
    }
    if user.is_empty() || secret.is_empty() {
        return Err("IMAP credentials are incomplete".into());
    }
    let secure = raw["imapSecure"] != false;
    let default = if secure { 993 } else { 143 };
    let port = raw["imapPort"]
        .as_str()
        .and_then(|v| v.trim().parse::<u16>().ok())
        .filter(|p| *p > 0)
        .unwrap_or(default);
    Ok(Account {
        host,
        port,
        secure,
        user,
        secret,
    })
}
fn decoded_header(value: Option<&[u8]>) -> String {
    let Some(value) = value else {
        return String::new();
    };
    let mut header = b"Subject: ".to_vec();
    header.extend_from_slice(value);
    mailparse::parse_header(&header)
        .map(|(parsed, _)| parsed.get_value())
        .unwrap_or_else(|_| String::from_utf8_lossy(value).into_owned())
        .chars()
        .take(2048)
        .collect()
}
fn addresses(values: &Option<Vec<Address<'_>>>) -> String {
    values
        .as_ref()
        .map(|values| {
            values
                .iter()
                .filter_map(|entry| {
                    let name = decoded_header(entry.name);
                    let mailbox = entry
                        .mailbox
                        .map(String::from_utf8_lossy)
                        .unwrap_or_default();
                    let host = entry.host.map(String::from_utf8_lossy).unwrap_or_default();
                    let address = if !host.is_empty() {
                        format!("{mailbox}@{host}")
                    } else {
                        mailbox.into_owned()
                    };
                    if address.is_empty() && name.is_empty() {
                        None
                    } else if name.is_empty() {
                        Some(address)
                    } else if address.is_empty() {
                        Some(name)
                    } else {
                        Some(format!("{name} <{address}>"))
                    }
                })
                .collect::<Vec<_>>()
                .join(", ")
                .chars()
                .take(2048)
                .collect()
        })
        .unwrap_or_default()
}
fn envelope_date(message: &Fetch) -> String {
    message
        .envelope()
        .and_then(|envelope| envelope.date)
        .and_then(|raw| std::str::from_utf8(raw).ok())
        .and_then(|raw| mailparse::dateparse(raw).ok())
        .and_then(|seconds| chrono::DateTime::<chrono::Utc>::from_timestamp(seconds, 0))
        .map(|date| date.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
        .unwrap_or_default()
}
fn summary(message: &Fetch, validity: &str) -> Value {
    let envelope = message.envelope();
    let subject = decoded_header(envelope.and_then(|v| v.subject));
    json!({"uid":message.uid.unwrap_or(message.message).to_string(),"uidValidity":validity,
      "subject":if subject.is_empty(){"(No subject)".to_owned()}else{subject},
      "from":envelope.map(|v|addresses(&v.from)).unwrap_or_default(),"to":envelope.map(|v|addresses(&v.to)).unwrap_or_default(),
      "date":envelope_date(message),"size":message.size.unwrap_or(0),"preview":"","body":""})
}
#[derive(Debug, Clone)]
struct BodyPart {
    section: Vec<u32>,
    mime: String,
}
fn body_parts(node: &BodyStructure<'_>, section: Vec<u32>) -> Vec<BodyPart> {
    let common = match node {
        BodyStructure::Basic { common, .. }
        | BodyStructure::Text { common, .. }
        | BodyStructure::Message { common, .. }
        | BodyStructure::Multipart { common, .. } => common,
    };
    if common
        .disposition
        .as_ref()
        .is_some_and(|d| d.ty.eq_ignore_ascii_case("attachment"))
    {
        return vec![];
    }
    match node {
        BodyStructure::Text { .. }
            if common.ty.subtype.eq_ignore_ascii_case("html")
                || common.ty.subtype.eq_ignore_ascii_case("plain") =>
        {
            vec![BodyPart {
                section: if section.is_empty() { vec![1] } else { section },
                mime: format!("text/{}", common.ty.subtype.to_ascii_lowercase()),
            }]
        }
        BodyStructure::Multipart { bodies, .. } => {
            let parts: Vec<_> = bodies
                .iter()
                .enumerate()
                .flat_map(|(index, node)| {
                    let mut path = section.clone();
                    path.push(index as u32 + 1);
                    body_parts(node, path)
                })
                .collect();
            if common.ty.subtype.eq_ignore_ascii_case("alternative") {
                let has_html = parts.iter().any(|p| p.mime == "text/html");
                parts
                    .into_iter()
                    .filter(|p| p.mime == if has_html { "text/html" } else { "text/plain" })
                    .collect()
            } else {
                parts
            }
        }
        _ => vec![],
    }
}
fn plain_html(text: &str) -> String {
    format!(
        "<pre>{}</pre>",
        text.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
    )
}
fn decode_body(headers: &[u8], body: &[u8], mime: &str) -> Result<String> {
    let mut message = headers.to_vec();
    if !message.ends_with(b"\r\n\r\n") {
        if !message.ends_with(b"\r\n") {
            message.extend_from_slice(b"\r\n");
        }
        message.extend_from_slice(b"\r\n");
    }
    message.extend_from_slice(body);
    let text = mailparse::parse_mail(&message)
        .map_err(|e| e.to_string())?
        .get_body()
        .map_err(|e| e.to_string())?;
    Ok(if mime == "text/html" {
        text
    } else {
        plain_html(&text)
    })
}
fn read_session<T: Read + Write>(
    client: Client<T>,
    account: &Account,
    uid: Option<(&str, &str)>,
    limit: usize,
) -> Result<Vec<Value>> {
    let mut session = client
        .login(&account.user, &account.secret)
        .map_err(|(error, _)| error.to_string())?;
    let result = (|| {
        let mailbox = session.examine("INBOX").map_err(|e| e.to_string())?;
        let validity = mailbox
            .uid_validity
            .map(|v| v.to_string())
            .unwrap_or_default();
        let started = Instant::now();
        if let Some((uid, expected)) = uid {
            if !expected.is_empty() && expected != validity {
                return Err("Mailbox changed; refresh the inbox".into());
            }
            let messages = session
                .uid_fetch(uid, "(UID RFC822.SIZE ENVELOPE INTERNALDATE BODYSTRUCTURE)")
                .map_err(|e| e.to_string())?;
            let message = messages.iter().next().ok_or("Message no longer exists")?;
            let mut item = summary(message, &validity);
            let parts = message
                .bodystructure()
                .map(|node| body_parts(node, vec![]))
                .unwrap_or_default();
            if parts.len() > 64 {
                return Err("Message has too many MIME body parts".into());
            }
            let mut bodies = vec![];
            let mut bytes = 0;
            for part in parts {
                if started.elapsed() > Duration::from_secs(90) {
                    return Err("Mail body request timed out".into());
                }
                let section = part
                    .section
                    .iter()
                    .map(u32::to_string)
                    .collect::<Vec<_>>()
                    .join(".");
                // PEEK preserves read status and section requests never download attachments.
                let response = session
                    .uid_fetch(
                        uid,
                        format!("(BODY.PEEK[{section}.MIME] BODY.PEEK[{section}])"),
                    )
                    .map_err(|e| e.to_string())?;
                let data = response.iter().next().ok_or("Message no longer exists")?;
                let headers = data
                    .section(&SectionPath::Part(
                        part.section.clone(),
                        Some(MessageSection::Mime),
                    ))
                    .unwrap_or(b"Content-Type: text/plain; charset=utf-8\r\n\r\n");
                let body = data
                    .section(&SectionPath::Part(part.section, None))
                    .ok_or("Message body is unavailable")?;
                bytes += body.len();
                if bytes > BODY_LIMIT {
                    return Err("Mail body exceeds limit".into());
                }
                bodies.push(decode_body(headers, body, &part.mime)?);
            }
            item["body"] = json!(bodies.join("\n"));
            return Ok(vec![item]);
        }
        if mailbox.exists == 0 {
            return Ok(vec![]);
        }
        let start = mailbox.exists.saturating_sub(limit as u32 - 1).max(1);
        let range = format!("{start}:{}", mailbox.exists);
        let messages = session
            .fetch(range, "(UID RFC822.SIZE ENVELOPE INTERNALDATE)")
            .map_err(|e| e.to_string())?;
        Ok(messages
            .iter()
            .rev()
            .map(|message| summary(message, &validity))
            .collect())
    })();
    let _ = session.logout();
    result
}
fn protocol_line(socket: &mut TcpStream) -> Result<String> {
    let mut line = Vec::new();
    let started = Instant::now();
    loop {
        if line.len() >= 65536 || started.elapsed() > TIMEOUT {
            return Err("IMAP greeting exceeds limits".into());
        }
        let mut byte = [0];
        socket.read_exact(&mut byte).map_err(|e| e.to_string())?;
        line.push(byte[0]);
        if byte[0] == b'\n' {
            return String::from_utf8(line).map_err(|e| e.to_string());
        }
    }
}
fn preauth_capabilities(socket: &mut TcpStream) -> Result<bool> {
    if !protocol_line(socket)?
        .to_ascii_uppercase()
        .starts_with("* OK")
    {
        return Err("IMAP server rejected the connection".into());
    }
    socket
        .write_all(b"NATIVE0 CAPABILITY\r\n")
        .map_err(|e| e.to_string())?;
    let mut starttls = false;
    for _ in 0..64 {
        let line = protocol_line(socket)?;
        starttls |= line
            .split_whitespace()
            .any(|token| token.eq_ignore_ascii_case("STARTTLS"));
        if line.starts_with("NATIVE0 ") {
            if !line.to_ascii_uppercase().starts_with("NATIVE0 OK") {
                return Err("IMAP capability request failed".into());
            }
            return Ok(starttls);
        }
    }
    Err("IMAP capability response exceeds limits".into())
}
fn connect(account: &Account, uid: Option<(&str, &str)>, limit: usize) -> Result<Vec<Value>> {
    let mut failure = None;
    let mut socket = None;
    for address in (account.host.as_str(), account.port)
        .to_socket_addrs()
        .map_err(|e| e.to_string())?
        .take(3)
    {
        match TcpStream::connect_timeout(&address, TIMEOUT) {
            Ok(stream) => {
                socket = Some(stream);
                break;
            }
            Err(error) => failure = Some(error.to_string()),
        }
    }
    let mut socket =
        socket.ok_or_else(|| failure.unwrap_or("IMAP host could not be resolved".into()))?;
    socket
        .set_read_timeout(Some(TIMEOUT))
        .map_err(|e| e.to_string())?;
    socket
        .set_write_timeout(Some(TIMEOUT))
        .map_err(|e| e.to_string())?;
    let tls = native_tls::TlsConnector::builder()
        .build()
        .map_err(|e| e.to_string())?;
    if account.secure {
        let socket = tls
            .connect(&account.host, socket)
            .map_err(|e| e.to_string())?;
        let mut client = Client::new(socket);
        client.read_greeting().map_err(|e| e.to_string())?;
        read_session(client, account, uid, limit)
    } else {
        if preauth_capabilities(&mut socket)? {
            socket
                .write_all(b"NATIVE1 STARTTLS\r\n")
                .map_err(|e| e.to_string())?;
            if !protocol_line(&mut socket)?
                .to_ascii_uppercase()
                .starts_with("NATIVE1 OK")
            {
                return Err("IMAP server rejected STARTTLS".into());
            }
            let stream = tls
                .connect(&account.host, socket)
                .map_err(|e| e.to_string())?;
            read_session(Client::new(stream), account, uid, limit)
        } else {
            read_session(Client::new(socket), account, uid, limit)
        }
    }
}
fn cached(key: &str) -> Option<Value> {
    let mut cache = CACHE.lock().unwrap();
    let index = cache.iter().position(|(entry, _, _)| entry == key)?;
    let entry = cache.remove(index)?;
    let value = entry.1.clone();
    cache.push_back(entry);
    Some(value)
}
fn remember(key: String, item: Value) {
    let bytes = serde_json::to_vec(&item)
        .map(|value| value.len() * 2)
        .unwrap_or(CACHE_LIMIT + 1);
    if bytes > CACHE_LIMIT {
        return;
    }
    let mut cache = CACHE.lock().unwrap();
    let mut used: usize = cache.iter().map(|(_, _, bytes)| bytes).sum();
    while used + bytes > CACHE_LIMIT || cache.len() >= 256 {
        if let Some((_, _, size)) = cache.pop_front() {
            used -= size
        } else {
            break;
        }
    }
    cache.push_back((key, item, bytes));
}
pub fn handles(channel: &str) -> bool {
    matches!(channel, "mail:inbox:list" | "mail:message:get")
}
pub async fn handle(app: &AppHandle, channel: &str, args: &[Value]) -> Result<Value> {
    let task = async {
        let raw = args.first().cloned().unwrap_or(Value::Null);
        let raw = if raw.is_object() {
            raw
        } else {
            app.state::<Desktop>()
                .store
                .lock()
                .unwrap()
                .value("mail-account-config", Value::Null)
        };
        let account = account(&raw)?;
        let detailed = channel == "mail:message:get";
        let uid = if detailed {
            args.get(1).and_then(Value::as_str).unwrap_or("").to_owned()
        } else {
            String::new()
        };
        if detailed && (uid.is_empty() || !uid.bytes().all(|c| c.is_ascii_digit())) {
            return Err("Invalid mail request".into());
        }
        let validity = args.get(2).and_then(Value::as_str).unwrap_or("").to_owned();
        let key = json!([
            account.host,
            account.port,
            account.secure,
            account.user,
            validity,
            uid
        ])
        .to_string();
        if detailed {
            if let Some(item) = cached(&key) {
                return Ok(vec![item]);
            }
        }
        let permit = SLOTS
            .clone()
            .try_acquire_owned()
            .map_err(|_| "Mail reader is busy; retry shortly".to_owned())?;
        let _guard = if detailed {
            Some(DETAILS.lock().await)
        } else {
            None
        };
        if detailed {
            if let Some(item) = cached(&key) {
                return Ok(vec![item]);
            }
        }
        let limit = if args.first().is_some_and(Value::is_object) {
            args.get(1)
        } else {
            args.first()
        }
        .and_then(Value::as_f64)
        .filter(|v| v.is_finite())
        .unwrap_or(10.)
        .floor()
        .clamp(1., 30.) as usize;
        let job = tauri::async_runtime::spawn_blocking(move || {
            let _permit = permit;
            connect(
                &account,
                if detailed {
                    Some((&uid, &validity))
                } else {
                    None
                },
                limit,
            )
        });
        let items = tokio::time::timeout(Duration::from_secs(120), job)
            .await
            .map_err(|_| "Mail request timed out".to_owned())?
            .map_err(|e| e.to_string())??;
        if detailed {
            if let Some(item) = items.first() {
                remember(key, item.clone());
            }
        }
        Ok::<_, String>(items)
    };
    Ok(match task.await {
        Ok(items) => json!({"ok":true,"items":items,"message":""}),
        Err(message) => json!({"ok":false,"items":[],"message":message}),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_credentials_and_ports() {
        assert!(account(&json!({})).is_err());
        let value=account(&json!({"imapHost":"host","authUser":"user","authSecret":"secret","imapPort":"invalid"})).unwrap();
        assert_eq!(value.port, 993);
    }
    #[test]
    fn decodes_mime_header_words_and_plain_body() {
        assert_eq!(decoded_header(Some(b"=?UTF-8?B?5rWL6K+V?=")), "测试");
        assert_eq!(decode_body(b"Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n",b"YTxiJmM=","text/plain").unwrap(),"<pre>a&lt;b&amp;c</pre>");
    }
    #[test]
    fn body_cache_obeys_identity_and_budget() {
        let key = format!("test-{}", rand::random::<u64>());
        remember(key.clone(), json!({"body":"hello"}));
        assert_eq!(cached(&key).unwrap()["body"], "hello");
        assert!(cached("unrelated-account").is_none());
    }
    #[test]
    fn imap_fixture_lists_headers_and_fetches_only_the_selected_body_section() {
        use std::{
            io::{BufRead, BufReader},
            net::TcpListener,
            thread,
        };
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let queries = Arc::new(Mutex::new(Vec::new()));
        let recorded = queries.clone();
        let worker = thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            socket
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut reader = BufReader::new(socket.try_clone().unwrap());
            socket.write_all(b"* OK local IMAP fixture\r\n").unwrap();
            loop {
                let mut line = String::new();
                if reader.read_line(&mut line).unwrap_or(0) == 0 {
                    break;
                }
                let (tag, command) = line.trim_end().split_once(' ').unwrap();
                let upper = command.to_ascii_uppercase();
                if !upper.starts_with("LOGIN ") {
                    recorded.lock().unwrap().push(upper.clone());
                }
                let mut response = String::new();
                if upper == "CAPABILITY" {
                    response.push_str("* CAPABILITY IMAP4rev1\r\n");
                }
                if upper.starts_with("EXAMINE ") {
                    response.push_str("* 1 EXISTS\r\n* OK [UIDVALIDITY 123] fixture mailbox\r\n");
                }
                if upper.starts_with("FETCH ") || upper.contains("BODYSTRUCTURE") {
                    response.push_str("* 1 FETCH (UID 7 RFC822.SIZE 128 ENVELOPE (NIL \"Fixture\" ((NIL NIL \"from\" \"example.com\")) NIL NIL ((NIL NIL \"to\" \"example.com\")) NIL NIL NIL NIL) INTERNALDATE \"01-Jan-2026 00:00:00 +0000\"");
                    if upper.contains("BODYSTRUCTURE") {
                        response.push_str(" BODYSTRUCTURE (\"TEXT\" \"PLAIN\" (\"CHARSET\" \"UTF-8\") NIL NIL \"BASE64\" 8 1)");
                    }
                    response.push_str(")\r\n");
                } else if upper.starts_with("UID FETCH ") {
                    let headers="Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
                    let body = "SGVsbG8=";
                    response.push_str(&format!(
                        "* 1 FETCH (UID 7 BODY[1.MIME] {{{}}}\r\n{} BODY[1] {{{}}}\r\n{})\r\n",
                        headers.len(),
                        headers,
                        body.len(),
                        body
                    ));
                }
                if upper == "LOGOUT" {
                    response.push_str("* BYE fixture complete\r\n");
                }
                response.push_str(&format!("{tag} OK complete\r\n"));
                socket.write_all(response.as_bytes()).unwrap();
                if upper == "LOGOUT" {
                    break;
                }
            }
        });
        let account = Account {
            host: "127.0.0.1".into(),
            port,
            secure: false,
            user: "fixture".into(),
            secret: "fixture-only".into(),
        };
        let items = connect(&account, Some(("7", "123")), 1).unwrap();
        worker.join().unwrap();
        assert_eq!(items[0]["subject"], "Fixture");
        assert_eq!(items[0]["body"], "<pre>Hello</pre>");
        let queries = queries.lock().unwrap();
        assert!(queries
            .iter()
            .any(|query| query.contains("BODY.PEEK[1.MIME] BODY.PEEK[1]")));
        assert!(queries
            .iter()
            .all(|query| !query.contains("BODY[]") && !query.contains("RFC822)")));
    }
}
