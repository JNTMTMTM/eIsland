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

use super::{business, required, text, Music};
use crate::windows::Result;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use md5::{Digest, Md5};
use serde_json::{json, Map, Value};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
const USER_AGENT:&str="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SodaMusic/3.2.1 Chrome/136.0.7103.59 Electron/36.4.0-rs.22.release.main.1 TTElectron/36.4.0-rs.22.release.main.1 Safari/537.36";
#[derive(Default)]
pub(super) struct AuthState {
    initialized: bool,
    token: String,
    info: Value,
}
fn hex(bytes: usize) -> String {
    (0..bytes)
        .map(|_| format!("{:02x}", rand::random::<u8>()))
        .collect()
}
fn status(state: &str) -> Value {
    json!({"provider":"qishui","loggedIn":state=="confirmed","state":state,"retryAfterMs":0})
}
fn identity(app: &AppHandle) -> Result<Value> {
    let mut value = business::session(app);
    if !value.is_object() {
        value = json!({});
    }
    for key in ["deviceId", "installId"] {
        if text(&value[key]).is_empty() {
            value[key] = json!(format!(
                "{}{:015}",
                rand::random::<u8>() % 8 + 1,
                rand::random::<u64>() % 1000000000000000
            ));
        }
    }
    if text(&value["verifyPortraitId"]).is_empty() {
        value["verifyPortraitId"] = json!(format!("{}.login", hex(16)));
    }
    if text(&value["computerName"]).is_empty() {
        value["computerName"] = json!(std::env::var("COMPUTERNAME")
            .or_else(|_| std::env::var("HOSTNAME"))
            .unwrap_or_else(|_| "Windows-PC".into()));
    }
    business::save_session(app, &value)?;
    Ok(value)
}
fn form(value: &Value) -> String {
    let mut url = reqwest::Url::parse("http://localhost/").unwrap();
    if let Some(value) = value.as_object() {
        for (key, value) in value {
            if !value.is_null() {
                let value = if value.is_object() || value.is_array() {
                    value.to_string()
                } else {
                    text(value)
                };
                url.query_pairs_mut().append_pair(key, &value);
            }
        }
    }
    url.query().unwrap_or_default().to_owned()
}
fn biz_params(value: &Value) -> Value {
    if value.is_object() {
        return value.clone();
    }
    if let Some(value) = value.as_str() {
        if let Ok(value) = serde_json::from_str::<Value>(value) {
            return value;
        }
        if let Ok(url) = reqwest::Url::parse(&format!("http://localhost/?{value}")) {
            return Value::Object(
                url.query_pairs()
                    .map(|(key, value)| (key.into_owned(), json!(value)))
                    .collect(),
            );
        }
    }
    json!({})
}
impl Music {
    async fn evaluate(&self, app: &AppHandle, script: &str) -> Result<Value> {
        self.server(app)?.evaluate(self, app, script).await
    }
    async fn init_auth(&self, app: &AppHandle, state: &mut AuthState) -> Result<()> {
        if state.initialized && app.get_webview_window("qishui-auth").is_some() {
            return Ok(());
        }
        identity(app)?;
        let base = self.server(app)?.base.clone();
        self.window.handle(app,"open",&json!({"url":format!("{base}security_seed.html"),"redirect":format!("{base}bdms.js"),"userAgent":USER_AGENT})).await?;
        let seed = self
            .evaluate(
                app,
                "localStorage.getItem('xmsty') || localStorage.getItem('xmst') || ''",
            )
            .await?;
        state.token = seed["result"]
            .as_str()
            .filter(|token| token.len() == 120 && token.ends_with("=="))
            .map(str::to_owned)
            .unwrap_or_else(|| {
                URL_SAFE_NO_PAD.encode((0..88).map(|_| rand::random::<u8>()).collect::<Vec<_>>())
                    + "=="
            });
        self.evaluate(
            app,
            &format!(
                "localStorage.setItem('xmst',{0});localStorage.setItem('xmsty',{0});true",
                json!(state.token)
            ),
        )
        .await?;
        self.window
            .handle(
                app,
                "navigate",
                &json!({"url":format!("{base}security_host.html")}),
            )
            .await?;
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            let loaded=self.evaluate(app,"Boolean(window.bdms && window._sdkGlueVersionMap && window._sdkGlueVersionMap.bdmsVersion)").await?;
            if loaded["result"] == true {
                break;
            }
            if Instant::now() > deadline {
                return Err("QISHUI_SECURITY_SDK_TIMEOUT".into());
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        state.info = self.evaluate(app, "window.__qishuiBrowserInfo()").await?["result"].clone();
        let mut config = business::session(app);
        config["msToken"] = json!(state.token);
        business::save_session(app, &config)?;
        state.initialized = true;
        Ok(())
    }
    async fn passport(
        &self,
        app: &AppHandle,
        state: &AuthState,
        method: &str,
        path: &str,
        extra: Value,
        body: Option<Value>,
    ) -> Result<Value> {
        let identity = identity(app)?;
        let trace = hex(4);
        let mut query = json!({"passport_jssdk_version":"2.4.13","passport_jssdk_type":"normal","is_from_ttaccountsdk":"1","aid":"386088","language":"zh","account_sdk_source":"web","p_js_v":"2.4.13","p_js_t":"pro","p_zt":"3.3.5","p_ver":"1.0.29","request_host":"app%3A%2F%2Fresources","p_bd":"1.0.0.41","biz_trace_id":trace,"is_new_login":"1","is_from_iesaccountsaas":"1","device_id":identity["deviceId"],"install_id":identity["installId"],"did":identity["deviceId"],"iid":identity["installId"],"device_platform":"PC","version_code":"3.5.2","account_sdk_source_info":state.info["encrypted"],"msToken":state.token});
        if let Some(extra) = extra.as_object() {
            query.as_object_mut().unwrap().extend(extra.clone());
        }
        let mut url = reqwest::Url::parse(&format!("https://api.qishui.com{path}"))
            .map_err(|e| e.to_string())?;
        if let Some(query) = query.as_object() {
            for (key, value) in query {
                if !value.is_null() {
                    url.query_pairs_mut().append_pair(key, &text(value));
                }
            }
        }
        let trace_id = hex(16);
        let mut headers = json!({"Accept":"application/json, text/javascript","User-Agent":USER_AGENT,"x-tt-passport-verify-portrait":identity["verifyPortraitId"],"x-tt-passport-trace-id":trace,"x-tt-trace-id":format!("00-{trace_id}-{}-01",&trace_id[..16])});
        let body = body.map(|body| form(&body));
        if let Some(body) = &body {
            headers["Content-Type"] = json!("application/x-www-form-urlencoded");
            headers["x-ss-stub"] = json!(format!("{:X}", Md5::digest(body.as_bytes())));
        }
        let payload = json!({"method":method,"url":url.as_str(),"headers":headers,"body":body,"timeout":30000});
        let response = self
            .evaluate(app, &format!("window.__qishuiRequest({payload})"))
            .await?;
        let code = response["result"]["status"].as_u64().unwrap_or(0);
        if !(200..400).contains(&code) {
            return Err(format!("QISHUI_AUTH_HTTP_{code}"));
        }
        let envelope: Value =
            serde_json::from_str(response["result"]["body"].as_str().unwrap_or("{}"))
                .map_err(|_| "QISHUI_AUTH_INVALID_JSON")?;
        let signed = reqwest::Url::parse(response["request"]["url"].as_str().unwrap_or(""))
            .map_err(|_| "QISHUI_SECURITY_SIGNATURE_MISSING")?;
        let signed: Map<String, Value> = signed
            .query_pairs()
            .map(|(key, value)| (key.into_owned(), json!(value)))
            .collect();
        if signed.get("a_bogus").map(text).unwrap_or_default().len() != 44
            || signed.get("msToken").map(text).unwrap_or_default() != state.token
        {
            return Err("QISHUI_SECURITY_SIGNATURE_MISSING".into());
        }
        Ok(envelope)
    }
    pub(super) async fn authentication(
        &self,
        app: &AppHandle,
        channel: &str,
        args: &[Value],
    ) -> Result<Value> {
        if args.first().and_then(Value::as_str) != Some("qishui") {
            return Err("MUSIC_PROVIDER_NOT_SUPPORTED".into());
        }
        if channel == "music-provider-auth:status" {
            return Ok(status(if auth_logged_in(&business::session(app)) {
                "confirmed"
            } else {
                "idle"
            }));
        }
        if channel == "music-provider-auth:clear" {
            if let Some(window) = app.get_webview_window("qishui-auth") {
                let _ = window.eval(
                    "window.__qishuiCancelSecondVerify && window.__qishuiCancelSecondVerify()",
                );
            }
            let mut state = self.auth.lock().await;
            self.window.handle(app, "clear", &Value::Null).await?;
            if let Some(window) = app.get_webview_window("qishui-auth") {
                window.destroy().map_err(|e| e.to_string())?;
            }
            *state = AuthState::default();
            let mut config = business::session(app);
            if !config.is_object() {
                config = json!({});
            }
            config["cookie"] = json!("");
            config["msToken"] = json!("");
            business::save_session(app, &config)?;
            return Ok(status("idle"));
        }
        if !matches!(
            channel,
            "music-provider-auth:create-qr" | "music-provider-auth:check-qr"
        ) {
            return Err("Unsupported provider authentication operation".into());
        }
        let token = if channel == "music-provider-auth:check-qr" {
            required(args.get(1), "QISHUI_QR_TOKEN_REQUIRED")?
        } else {
            String::new()
        };
        let mut state = self.auth.lock().await;
        self.init_auth(app, &mut state).await?;
        if channel == "music-provider-auth:create-qr" {
            let envelope=self.passport(app,&state,"GET","/passport/web/get_qrcode/",json!({"next":"https://api.qishui.com","need_logo":"false","need_short_url":"false"}),None).await?;
            if envelope["message"] != "success"
                || envelope["data"]["error_code"].as_i64().unwrap_or(0) != 0
            {
                return Err(format!(
                    "QISHUI_QR_CREATE_{}",
                    text(&envelope["data"]["error_code"])
                ));
            }
            let token = required(
                envelope["data"].get("token"),
                "QISHUI_QR_PAYLOAD_INCOMPLETE",
            )?;
            let index =
                reqwest::Url::parse(envelope["data"]["qrcode_index_url"].as_str().unwrap_or(""))
                    .map_err(|_| "QISHUI_QR_PAYLOAD_INCOMPLETE")?;
            let scan_token = index
                .query_pairs()
                .find(|(key, _)| key == "token")
                .map(|(_, value)| value.into_owned())
                .ok_or("QISHUI_QR_PAYLOAD_INCOMPLETE")?;
            let mut scan =
                reqwest::Url::parse("https://bff-pc.qishui.com/light/invoke/scan_login").unwrap();
            scan.query_pairs_mut()
                .append_pair("token", &scan_token)
                .append_pair("os", "Windows")
                .append_pair("computer_name", &text(&identity(app)?["computerName"]));
            let expires = envelope["data"]["expire_time"]
                .as_f64()
                .filter(|value| value.is_finite() && *value > 0.)
                .map(|value| {
                    if value > 1_000_000_000_000. {
                        value
                    } else {
                        value * 1000.
                    }
                });
            let mut result = status("waiting");
            result["token"] = json!(token);
            result["qrContent"] = json!(scan.as_str().replace('+', "%20"));
            result["expiresAt"] = json!(expires);
            return Ok(result);
        }
        let body = json!({"need_logo":"false","need_short_url":"false","is_frontier":"true","token":token,"is_new_login":"1","next":"https://api.qishui.com"});
        let mut envelope = self
            .passport(
                app,
                &state,
                "POST",
                "/passport/web/check_qrconnect/",
                json!({}),
                Some(body.clone()),
            )
            .await?;
        if envelope["data"]["error_code"] == 2046 {
            let identity = identity(app)?;
            let mut decision = envelope.as_object().cloned().unwrap_or_default();
            decision.remove("data");
            if let Some(data) = envelope["data"].as_object() {
                decision.extend(data.clone());
            }
            decision
                .entry("verify_portrait_id")
                .or_insert(identity["verifyPortraitId"].clone());
            let decision = Value::Object(decision);
            let additional = biz_params(&decision["biz_params"]);
            let general = json!({"generalParams":{"device_id":identity["deviceId"],"install_id":identity["installId"],"did":identity["deviceId"],"iid":identity["installId"],"device_platform":"PC","version_code":"3.5.2"}});
            self.window.handle(app, "show", &Value::Null).await?;
            self.window.handle(app, "focus", &Value::Null).await?;
            let verified = self
                .evaluate(
                    app,
                    &format!("window.__qishuiSecondVerify({decision},{general})"),
                )
                .await;
            let _ = self.window.handle(app, "hide", &Value::Null).await;
            let verified = verified?;
            if verified["result"]["status"] != true {
                let mut result = status("mfa_cancelled");
                result["errorCode"] = json!("QISHUI_MFA_CANCELLED");
                result["message"] = verified["result"]["message"].clone();
                return Ok(result);
            }
            let mut body = body;
            if let Some(additional) = additional.as_object() {
                body.as_object_mut().unwrap().extend(additional.clone());
            }
            envelope = self
                .passport(
                    app,
                    &state,
                    "POST",
                    "/passport/web/check_qrconnect/",
                    json!({"isResend":"true"}),
                    Some(body),
                )
                .await?;
            if envelope["data"]["error_code"] == 2046 {
                return Err("QISHUI_MFA_SERVER_RETRY_REQUIRED".into());
            }
        }
        let data = &envelope["data"];
        let raw = text(&data["status"]);
        if data["error_code"].as_i64().unwrap_or(0) == 0
            && (raw == "3" || raw == "confirmed" || !text(&data["session_cookie"]).is_empty())
        {
            let mut config = business::session(app);
            let mut pairs = std::collections::BTreeMap::new();
            for cookie in [text(&config["cookie"]), text(&data["session_cookie"])] {
                for part in cookie.split(';') {
                    if let Some((name, value)) = part.split_once('=') {
                        pairs.insert(name.trim().to_owned(), value.trim().to_owned());
                    }
                }
            }
            let cookies = self.window.handle(app, "cookies", &Value::Null).await?;
            if let Some(cookies) = cookies.as_array() {
                for cookie in cookies {
                    let domain = cookie["domain"]
                        .as_str()
                        .unwrap_or("")
                        .trim_start_matches('.')
                        .to_lowercase();
                    if domain == "qishui.com" || domain.ends_with(".qishui.com") {
                        pairs.insert(text(&cookie["name"]), text(&cookie["value"]));
                    }
                }
            }
            config["cookie"] = json!(pairs
                .into_iter()
                .filter(|(key, value)| !key.is_empty() && !value.is_empty())
                .map(|(key, value)| format!("{key}={value}"))
                .collect::<Vec<_>>()
                .join("; "));
            config["msToken"] = json!(state.token);
            business::save_session(app, &config)?;
        }
        if auth_logged_in(&business::session(app)) {
            return Ok(status("confirmed"));
        }
        let code = data["error_code"].as_i64().unwrap_or(0);
        let mut result = status(if code == 2 {
            "expired"
        } else if code == 7 {
            "rate_limited"
        } else if raw == "2" {
            "scanned"
        } else {
            "waiting"
        });
        if code == 2 || code == 7 {
            result["errorCode"] = json!(code.to_string());
        }
        if code == 7 {
            result["retryAfterMs"] = json!(60000);
        } else if result["state"] == "waiting" {
            let message = if !text(&envelope["message"]).is_empty() {
                envelope["message"].clone()
            } else {
                data["description"].clone()
            };
            if !message.is_null() {
                result["message"] = message;
            }
        }
        Ok(result)
    }
}
fn auth_logged_in(value: &Value) -> bool {
    business::cookie(&value["cookie"]).split(';').any(|part| {
        part.split_once('=').is_some_and(|(key, _)| {
            matches!(
                key.trim().to_ascii_lowercase().as_str(),
                "sessionid" | "sessionid_ss" | "sid_guard" | "sid_tt"
            )
        })
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn qr_auth_status_never_treats_tokens_or_partial_uid_as_login() {
        assert!(!auth_logged_in(&json!({"cookie":"msToken=x; uid_tt=y"})));
        assert!(auth_logged_in(&json!({"cookie":"sessionid=fixture"})));
    }
    #[test]
    fn second_verify_parameters_support_json_and_form_encoding() {
        assert_eq!(biz_params(&json!("{\"ticket\":\"x\"}"))["ticket"], "x");
        assert_eq!(biz_params(&json!("ticket=a%2Bb"))["ticket"], "a+b");
        assert_eq!(form(&json!({"value":"a b","empty":null})), "value=a+b");
    }
}
