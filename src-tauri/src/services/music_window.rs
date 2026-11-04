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
use serde_json::{json, Value};
use std::{sync::Mutex, time::Duration};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::watch;

const LABEL: &str = "qishui-auth";
pub struct AuthWindow {
    navigation: tokio::sync::Mutex<()>,
    finished: watch::Sender<u64>,
    expected: Mutex<String>,
    base: Mutex<String>,
}
impl AuthWindow {
    pub fn new() -> Self {
        let (finished, _) = watch::channel(0);
        Self {
            navigation: tokio::sync::Mutex::new(()),
            finished,
            expected: Mutex::new(String::new()),
            base: Mutex::new(String::new()),
        }
    }
    pub async fn handle(&self, app: &AppHandle, operation: &str, args: &Value) -> Result<Value> {
        match operation {
            "open" | "navigate" => {
                let _guard = self.navigation.lock().await;
                let raw = args["url"].as_str().ok_or("Missing verification page")?;
                let url = tauri::Url::parse(raw).map_err(|e| e.to_string())?;
                if url.scheme() != "http" || url.host_str() != Some("127.0.0.1") {
                    return Err("Verification page must be a private loopback resource".into());
                }
                if operation == "open" {
                    *self.base.lock().unwrap() = raw
                        .rsplit_once('/')
                        .ok_or("Invalid verification page")?
                        .0
                        .to_owned()
                        + "/";
                }
                if !raw.starts_with(self.base.lock().unwrap().as_str()) {
                    return Err("Verification navigation outside asset server".into());
                }
                let mut loaded = self.finished.subscribe();
                *self.expected.lock().unwrap() = raw.to_owned();
                if operation == "open" {
                    if let Some(old) = app.get_webview_window(LABEL) {
                        old.destroy().map_err(|e| e.to_string())?;
                    }
                    let redirect = args["redirect"].as_str().unwrap_or("");
                    if !redirect.starts_with(self.base.lock().unwrap().as_str()) {
                        return Err("Invalid verification SDK asset".into());
                    }
                    let script = initialization_script(redirect)?;
                    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::External(url))
                        .title("eIsland")
                        .inner_size(980., 760.)
                        .min_inner_size(760., 600.)
                        .visible(false)
                        .user_agent(args["userAgent"].as_str().unwrap_or("eIsland"))
                        .data_directory(
                            app.path()
                                .app_cache_dir()
                                .map_err(|e| e.to_string())?
                                .join(format!("qishui-auth-{}", std::process::id())),
                        )
                        .incognito(true)
                        // Match the existing signer's browser transport only in this isolated
                        // data directory. Main application windows keep web security enabled.
                        .additional_browser_args("--disable-web-security")
                        .initialization_script(&script)
                        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                        .on_navigation(|url| {
                            (url.scheme() == "http" && url.host_str() == Some("127.0.0.1"))
                                || (url.scheme() == "https"
                                    && matches!(
                                        url.host_str(),
                                        Some(
                                            "api.qishui.com"
                                                | "verify.zijieapi.com"
                                                | "auth.zijieapi.com"
                                        )
                                    ))
                        })
                        .on_page_load(|window, payload| {
                            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                                let services = window.app_handle().state::<super::Services>();
                                let host = &services.music.window;
                                if payload.url().as_str() == host.expected.lock().unwrap().as_str()
                                {
                                    host.finished.send_modify(|value| *value += 1);
                                }
                            }
                        })
                        .build()
                        .map_err(|e| e.to_string())?;
                    let handle = app.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api,.. } = event {
                            api.prevent_close();
                            if let Some(window) = handle.get_webview_window(LABEL) {
                                let _ = window.eval("window.__qishuiCancelSecondVerify && window.__qishuiCancelSecondVerify()");
                                let _ = window.hide();
                            }
                        }
                    });
                } else {
                    app.get_webview_window(LABEL)
                        .ok_or("Verification window unavailable")?
                        .navigate(url)
                        .map_err(|e| e.to_string())?;
                }
                tokio::time::timeout(Duration::from_secs(30), loaded.changed())
                    .await
                    .map_err(|_| "Verification page load timed out".to_owned())?
                    .map_err(|e| e.to_string())?;
                Ok(json!(true))
            }
            "clear" => {
                if let Some(window) = app.get_webview_window(LABEL) {
                    window
                        .clear_all_browsing_data()
                        .map_err(|e| e.to_string())?;
                }
                Ok(Value::Null)
            }
            _ => {
                let window = app
                    .get_webview_window(LABEL)
                    .ok_or("Verification window unavailable")?;
                match operation {
                    "eval" => {
                        let script = args["script"].as_str().ok_or("Missing verification script")?;
                        let callback = args["callbackUrl"].as_str().ok_or("Missing verification callback")?;
                        let parsed = tauri::Url::parse(callback).map_err(|e|e.to_string())?;
                        if parsed.scheme() != "http" || parsed.host_str() != Some("127.0.0.1") { return Err("Invalid verification callback".into()); }
                        let script = serde_json::to_string(script).map_err(|e|e.to_string())?;
                        let callback = serde_json::to_string(callback).map_err(|e|e.to_string())?;
                        window.eval(format!(r#"(async()=>{{let value;try{{value={{result:await (0,eval)({script})??null,request:window.__eislandPassportRequest??null}}}}catch(error){{value={{error:String(error.message||error)}}}}await window.__eislandReply({callback},{{method:'POST',body:JSON.stringify(value)}})}})()"#)).map_err(|e|e.to_string())?;
                        return Ok(json!({"scheduled":true}));
                    },
                    "cookies" => return Ok(json!(window.cookies().map_err(|e|e.to_string())?.iter().map(|c|json!({"name":c.name(),"value":c.value(),"domain":c.domain().unwrap_or(""),"path":c.path().unwrap_or("/")})).collect::<Vec<_>>())),
                    "title" => window.set_title(args["title"].as_str().unwrap_or("eIsland")),
                    "size" => window.set_size(tauri::LogicalSize::new(args["width"].as_f64().unwrap_or(980.),args["height"].as_f64().unwrap_or(760.))),
                    "center" => window.center(), "show" => window.show(), "focus" => window.set_focus(), "hide" => window.hide(), "destroy" => window.destroy(),
                    _ => return Err("Unsupported verification operation".into()),
                }.map_err(|e|e.to_string())?;
                Ok(Value::Null)
            }
        }
    }
}
fn initialization_script(redirect: &str) -> Result<String> {
    let redirect = serde_json::to_string(redirect).map_err(|e| e.to_string())?;
    Ok(format!(
        r#"(()=>{{
      window.__eislandReply=window.fetch.bind(window);
      const replacement={redirect};
      const map=value=>String(value).includes('/rc-client-security/web/stable/1.0.0.41/bdms.js')?replacement:value;
      const src=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
      Object.defineProperty(HTMLScriptElement.prototype,'src',{{...src,set(value){{src.set.call(this,map(value));}}}});
      const attribute=Element.prototype.setAttribute;
      Element.prototype.setAttribute=function(name,value){{return attribute.call(this,name,this instanceof HTMLScriptElement&&String(name).toLowerCase()==='src'?map(value):value);}};
      const open=XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open=function(method,url){{
        if(/^https:\/\/api\.qishui\.com\/passport\//.test(String(url)))window.__eislandPassportRequest={{method:String(method),url:String(url),requestHeaders:{{}}}};
        return open.apply(this,arguments);
      }};
    }})()"#
    ))
}
