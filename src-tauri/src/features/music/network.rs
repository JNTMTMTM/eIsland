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

use serde_json::{json, Value};
use std::time::Duration;
const MAX_RESPONSE: usize = 16 * 1024 * 1024;

use crate::infrastructure::http::bounded;

pub(crate) async fn fetch(client: &reqwest::Client, args: &[Value]) -> Value {
    let Some(url) = args
        .first()
        .and_then(Value::as_str)
        .and_then(|raw| reqwest::Url::parse(raw).ok())
        .filter(|url| matches!(url.scheme(), "http" | "https"))
    else {
        return json!({"ok":false,"status":400,"body":""});
    };
    let options = args.get(1).unwrap_or(&Value::Null);
    let method = options["method"].as_str().unwrap_or("GET");
    let Ok(method) = reqwest::Method::from_bytes(method.as_bytes()) else {
        return json!({"ok":false,"status":400,"body":""});
    };
    let timeout = options["timeoutMs"]
        .as_f64()
        .filter(|v| v.is_finite() && *v > 0.)
        .unwrap_or(10000.)
        .min(300000.);
    let mut request = client
        .request(method.clone(), url)
        .timeout(Duration::from_millis(timeout as u64));
    if let Some(headers) = options["headers"].as_object() {
        for (name, value) in headers {
            let value = super::text(value)
                .chars()
                .filter(|c| (*c as u32) <= 255)
                .collect::<String>();
            if let (Ok(name), Ok(value)) = (
                reqwest::header::HeaderName::from_bytes(name.trim().as_bytes()),
                reqwest::header::HeaderValue::from_bytes(value.as_bytes()),
            ) {
                request = request.header(name, value);
            }
        }
    }
    if method != reqwest::Method::GET && method != reqwest::Method::HEAD {
        if let Some(body) = options["body"].as_str() {
            request = request.body(body.to_owned());
        }
    }
    // Never log headers, bodies or query strings: those may contain provider credentials.
    let mut response = match request.send().await {
        Ok(response) => response,
        Err(error) => {
            return json!({"ok":false,"status":if error.is_timeout(){408}else{0},"body":if error.is_timeout(){"timeout"}else{""}})
        }
    };
    let status = response.status().as_u16();
    match bounded(&mut response, MAX_RESPONSE).await {
        Ok(body) => {
            json!({"ok":(200..300).contains(&status),"status":status,"body":String::from_utf8_lossy(&body)})
        }
        Err(error) if error == "response too large" => {
            json!({"ok":false,"status":413,"body":"response too large"})
        }
        Err(error) if error == "timeout" => json!({"ok":false,"status":408,"body":"timeout"}),
        Err(_) => json!({"ok":false,"status":0,"body":""}),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_network_preserves_utf8_redirect_limits_and_scheme_validation() {
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let base = format!("http://{}", server.server_addr());
        let thread = std::thread::spawn(move || {
            for _ in 0..3 {
                let request = server.recv().unwrap();
                let response = match request.url() {
                    "/redirect" => tiny_http::Response::from_string("")
                        .with_status_code(302)
                        .with_header(tiny_http::Header::from_bytes("Location", "/lyrics").unwrap()),
                    "/large" => tiny_http::Response::from_string("x".repeat(MAX_RESPONSE + 1)),
                    _ => tiny_http::Response::from_string("[00:01.00]测试歌词"),
                };
                let _ = request.respond(response);
            }
        });
        tauri::async_runtime::block_on(async {
            let client = reqwest::Client::new();
            let response = fetch(&client, &[json!(format!("{base}/redirect"))]).await;
            assert_eq!(response["body"], "[00:01.00]测试歌词");
            assert_eq!(response["ok"], true);
            assert_eq!(
                fetch(&client, &[json!(format!("{base}/large"))]).await["status"],
                413
            );
            assert_eq!(
                fetch(&client, &[json!("file:///private")]).await["status"],
                400
            );
        });
        thread.join().unwrap();
    }
}
