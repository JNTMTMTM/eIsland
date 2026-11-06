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

use super::{data_directory, required, text, Music};
use crate::shared::Result;
use serde_json::{json, Map, Value};
use std::time::Duration;
use tauri::AppHandle;
const PC: &str = "https://api.qishui.com";
const PUBLIC_SEARCH: &str = "https://api-vehicle.volcengine.com/v2/search/type";
const PUBLIC_CONTENT: &str = "https://api-vehicle.volcengine.com/v2/custom/contents";

pub(super) fn session(app: &AppHandle) -> Value {
    std::fs::read_to_string(data_directory(app).join("music-providers/qishui.json"))
        .ok()
        .and_then(|value| serde_json::from_str(value.trim_start_matches('\u{feff}')).ok())
        .unwrap_or_else(|| json!({}))
}
pub(super) fn save_session(app: &AppHandle, value: &Value) -> Result<()> {
    let directory = data_directory(app).join("music-providers");
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let temporary = directory.join("qishui.json.tmp");
    std::fs::write(
        &temporary,
        serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    std::fs::rename(&temporary, directory.join("qishui.json")).map_err(|e| e.to_string())
}
pub(super) fn cookie(value: &Value) -> String {
    let mut pairs = std::collections::BTreeMap::new();
    let values = if let Some(values) = value.as_array() {
        values.clone()
    } else {
        vec![value.clone()]
    };
    for value in values {
        if let Some(object) = value.as_object() {
            for (key, value) in object {
                if !value.is_null() && !value.is_object() && !value.is_array() {
                    pairs.insert(key.to_owned(), text(value));
                }
            }
        } else {
            for part in text(&value).split(';') {
                if let Some((key, value)) = part.split_once('=') {
                    pairs.insert(key.trim().to_owned(), value.trim().to_owned());
                }
            }
        }
    }
    pairs
        .into_iter()
        .filter(|(key, value)| !key.is_empty() && !value.is_empty())
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("; ")
}
pub(super) fn logged_in(session: &Value) -> bool {
    cookie(&session["cookie"]).split(';').any(|pair| {
        pair.split_once('=').is_some_and(|(key, _)| {
            matches!(
                key.trim().to_ascii_lowercase().as_str(),
                "sessionid" | "sessionid_ss" | "sid_guard" | "sid_tt" | "uid_tt" | "uid_tt_ss"
            )
        })
    })
}
fn token(app: &AppHandle) -> String {
    let environment = [
        "QISHUI_ACCESS_TOKEN",
        "DOUYIN_ACCESS_TOKEN",
        "DOUYIN_OPEN_ACCESS_TOKEN",
    ]
    .iter()
    .find_map(|key| {
        std::env::var(key)
            .ok()
            .filter(|value| !value.trim().is_empty())
    });
    let value = environment.unwrap_or_else(|| {
        std::fs::read_to_string(data_directory(app).join("music-providers/qishui-token"))
            .unwrap_or_default()
    });
    let value = value.trim().trim_start_matches('\u{feff}');
    let lower = value.to_ascii_lowercase();
    if lower.starts_with("bearer ") {
        value[7..].trim().into()
    } else if lower.starts_with("access-token") || lower.starts_with("access_token") {
        value
            .split_once([':', '='])
            .map(|(_, value)| value.trim().to_owned())
            .unwrap_or_default()
    } else {
        value.to_owned()
    }
}
fn public_enabled() -> bool {
    std::env::var("QISHUI_PUBLIC_ENABLED").as_deref() != Ok("0")
}
fn num(value: &Value, fallback: f64) -> f64 {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        .filter(|value| value.is_finite())
        .unwrap_or(fallback)
}
fn truth(value: &Value) -> bool {
    !value.is_null() && value != false && value != 0 && value != ""
}
fn pick<'a>(value: &'a Value, keys: &[&str]) -> &'a Value {
    keys.iter()
        .find_map(|key| truth(&value[*key]).then_some(&value[*key]))
        .unwrap_or(&Value::Null)
}
fn object_or<'a>(value: &'a Value, fallback: &'a Value) -> &'a Value {
    if value.as_object().is_some_and(|value| !value.is_empty()) {
        value
    } else {
        fallback
    }
}
fn data(value: &Value) -> &Value {
    object_or(&value["data"], value)
}
fn list(value: &Value) -> Vec<Value> {
    for source in [value, &value["data"]] {
        for key in ["list", "items", "songs", "tracks", "media_list", "result"] {
            if let Some(items) = source[key].as_array() {
                return items.clone();
            }
        }
    }
    value["result_groups"]
        .as_array()
        .map(|groups| {
            groups
                .iter()
                .flat_map(|group| group["data"].as_array().cloned().unwrap_or_default())
                .collect()
        })
        .unwrap_or_default()
}
fn track(item: &Value) -> Value {
    let entity = object_or(&item["entity"], item);
    let track = object_or(&entity["track"], entity);
    let mut artists = track["artists"]
        .as_array()
        .map(|artists| {
            artists
                .iter()
                .map(|artist| text(pick(artist, &["name", "nick_name"])))
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if artists.is_empty() {
        let artist = text(pick(track, &["artist_name"]));
        let artist = if artist.is_empty() {
            text(pick(item, &["author_name"]))
        } else {
            artist
        };
        let artist = if artist.is_empty() {
            text(&item["author_info"]["name"])
        } else {
            artist
        };
        if !artist.is_empty() {
            artists.push(artist);
        }
    }
    let duration = num(
        pick(track, &["duration_ms", "duration"]),
        num(&item["duration"], 0.),
    );
    let duration = if truth(&track["duration_ms"]) || duration > 10000. {
        duration
    } else {
        duration * 1000.
    };
    let id = text(pick(track, &["id", "media_id"]));
    let id = if id.is_empty() {
        text(pick(item, &["item_id", "id"]))
    } else {
        id
    };
    let name = text(pick(track, &["name", "title"]));
    let name = if name.is_empty() {
        text(&item["title"])
    } else {
        name
    };
    let album = text(&track["album"]["name"]);
    let album = if album.is_empty() {
        text(pick(track, &["album_name"]))
    } else {
        album
    };
    let album = if album.is_empty() {
        text(pick(item, &["album_name", "collection_name"]))
    } else {
        album
    };
    let cover = text(pick(track, &["cover_url", "url_cover"]));
    let cover = if cover.is_empty() {
        text(pick(item, &["cover_url", "cover"]))
    } else {
        cover
    };
    let lyric = text(&track["lyric_info"]["content"]);
    let lyric = if lyric.is_empty() {
        text(&item["lyric_info"]["content"])
    } else {
        lyric
    };
    json!({"provider":"qishui","id":id,"providerSongId":id,"name":name,"artist":artists.join(" / "),"artists":artists.iter().map(|name|json!({"name":name})).collect::<Vec<_>>(),"album":album,"cover":cover,"duration":duration,"lyric":lyric})
}
fn songs(value: &Value, names: bool) -> Vec<Value> {
    list(value)
        .iter()
        .map(track)
        .filter(|song| !text(&song["id"]).is_empty() && (!names || !text(&song["name"]).is_empty()))
        .collect()
}
fn params(extra: &Value) -> Value {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string();
    let mut value = json!({"aid":"386088","app_name":"luna_pc","region":"cn","geo_region":"cn","os_region":"cn","sim_region":"","device_id":now,"cdid":"","iid":now,"version_name":"3.3.0","version_code":"30030000","channel":"official","build_mode":"master","network_carrier":"","ac":"wifi","tz_name":"Asia/Shanghai","resolution":"","device_platform":"windows","device_type":"Windows","os_version":"Windows 11","fp":now});
    if let Some(extra) = extra.as_object() {
        value.as_object_mut().unwrap().extend(extra.clone());
    }
    value
}
fn url(base: &str, params: &Value) -> Result<reqwest::Url> {
    let mut url = reqwest::Url::parse(base).map_err(|e| e.to_string())?;
    if let Some(params) = params.as_object() {
        for (key, value) in params {
            if !value.is_null() && value != "" {
                url.query_pairs_mut().append_pair(key, &text(value));
            }
        }
    }
    Ok(url)
}
async fn request_json(music: &Music, request: reqwest::RequestBuilder) -> Result<Value> {
    let mut response = request
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| {
            format!(
                "QISHUI_NETWORK_ERROR: {}",
                if e.is_timeout() {
                    "timeout"
                } else {
                    "request failed"
                }
            )
        })?;
    if !response.status().is_success() {
        return Err(format!("QISHUI_HTTP_{}", response.status().as_u16()));
    }
    let bytes = crate::infrastructure::http::bounded(&mut response, 16 * 1024 * 1024).await?;
    let value: Value = serde_json::from_slice(&bytes).map_err(|_| "QISHUI_INVALID_JSON")?;
    let code = num(
        value
            .get("status_code")
            .or_else(|| value.get("error_code"))
            .unwrap_or(&Value::Null),
        0.,
    );
    if code != 0. {
        return Err(format!("QISHUI_API_{code}"));
    }
    let _ = music;
    Ok(value)
}
async fn pc(
    music: &Music,
    app: &AppHandle,
    path: &str,
    query: Value,
    body: Option<Value>,
) -> Result<Value> {
    let session = session(app);
    let url = url(&format!("{PC}{path}"), &params(&query))?;
    let request = if let Some(body) = body {
        music.client.post(url).json(&body)
    } else {
        music.client.get(url)
    };
    let request = request
        .header("Accept", "application/json,text/plain,*/*")
        .header("Content-Type", "application/json; charset=utf-8")
        .header("User-Agent", "LunaPC/3.3.0(359450208)")
        .header("Referer", "https://www.qishui.com/")
        .header("x-luna-background-type", "foreground")
        .header("x-luna-is-background-req", "0")
        .header("x-luna-is-local-user", "1");
    let cookie = cookie(&session["cookie"]);
    let request = if cookie.is_empty() {
        request
    } else {
        request.header("Cookie", cookie)
    };
    request_json(music, request).await
}
async fn public(music: &Music, base: &str, query: Value) -> Result<Value> {
    request_json(
        music,
        music
            .client
            .get(url(base, &query)?)
            .header("Accept", "application/json,text/plain,*/*")
            .header("User-Agent", "eIsland/26.7 Qishui public catalog bridge"),
    )
    .await
}
async fn open(music: &Music, app: &AppHandle, path: &str, body: Value) -> Result<Value> {
    let token = token(app);
    if token.is_empty() {
        return Err("QISHUI_TOKEN_REQUIRED".into());
    }
    request_json(
        music,
        music
            .client
            .post(format!("https://open.douyin.com{path}"))
            .header("Accept", "application/json")
            .header("User-Agent", "eIsland/26.7 Qishui OpenAPI bridge")
            .header("access-token", token)
            .json(&body),
    )
    .await
}
fn search_result(
    values: Vec<Value>,
    limit: usize,
    offset: usize,
    logged_in: bool,
    public: bool,
) -> Value {
    let count = values.len();
    json!({"provider":"qishui","configured":true,"loggedIn":logged_in,"publicCatalog":public,"songs":values,"offset":offset,"limit":limit,"nextOffset":offset+count,"hasMore":count>=limit})
}
async fn search(music: &Music, app: &AppHandle, query: &str, options: &Value) -> Result<Value> {
    let limit = num(&options["limit"], 12.).clamp(1., 50.) as usize;
    let offset = num(&options["offset"], 0.).max(0.) as usize;
    if query.is_empty() {
        return Ok(
            json!({"provider":"qishui","songs":[],"offset":offset,"limit":limit,"hasMore":false}),
        );
    }
    if logged_in(&session(app)) {
        if let Ok(value) = pc(
            music,
            app,
            "/luna/pc/search/track",
            json!({"q":query,"cursor":offset,"count":limit,"search_method":"input"}),
            None,
        )
        .await
        {
            return Ok(search_result(
                songs(&value, true),
                limit,
                offset,
                true,
                false,
            ));
        }
    }
    if !token(app).is_empty() {
        if let Ok(value)=open(music,app,"/api/luna/v1/platform/feed/related-media/",json!({"search_query":query,"played_media":[],"count":limit,"common_params":{"trigger_name":"eisland_search","scene":"search","source":"eisland"}})).await{return Ok(search_result(songs(&value,true),limit,offset,false,false));}
    }
    if !public_enabled() {
        return Ok(
            json!({"provider":"qishui","configured":false,"songs":[],"error":"QISHUI_SEARCH_UNAVAILABLE"}),
        );
    }
    let value=public(music,PUBLIC_SEARCH,json!({"keyword":query,"search_type":"music","limit":((offset+limit)*3).clamp(36,100),"real_offset":0,"search_source":"qishui"})).await?;
    Ok(search_result(
        songs(&value, true)
            .into_iter()
            .skip(offset)
            .take(limit)
            .collect(),
        limit,
        offset,
        false,
        true,
    ))
}
async fn feed(music: &Music, app: &AppHandle, limit: usize) -> Result<Value> {
    if logged_in(&session(app)) {
        for path in ["/luna/feed/song-tab", "/luna/pc/feed/song-tab"] {
            if let Ok(value) = pc(
                music,
                app,
                path,
                json!({"cursor":0,"cnt":limit,"count":limit}),
                None,
            )
            .await
            {
                let values = songs(&value, false);
                if !values.is_empty() {
                    return Ok(
                        json!({"provider":"qishui","configured":true,"loggedIn":true,"songs":values}),
                    );
                }
            }
        }
    }
    if !token(app).is_empty() {
        let value=open(music,app,"/api/luna/v1/platform/feed/song-tab/",json!({"count":limit,"played_media":[],"common_params":{"trigger_name":"eisland_feed","scene":"feed","source":"eisland"}})).await?;
        return Ok(
            json!({"provider":"qishui","configured":true,"loggedIn":false,"songs":songs(&value,false).into_iter().take(limit).collect::<Vec<_>>()}),
        );
    }
    Ok(json!({"provider":"qishui","configured":false,"songs":[],"error":"QISHUI_TOKEN_REQUIRED"}))
}
async fn playlists(music: &Music, app: &AppHandle) -> Result<Value> {
    if !logged_in(&session(app)) {
        return Ok(json!({"provider":"qishui","loggedIn":false,"playlists":[]}));
    }
    let profile = pc(music, app, "/luna/pc/me", json!({}), None).await?;
    let user = data(&profile);
    let id = text(pick(user, &["user_id", "userId", "uid", "id"]));
    let created = async {
        if id.is_empty() {
            Ok(Value::Null)
        } else {
            pc(
                music,
                app,
                "/luna/pc/user/playlist",
                json!({"user_id":id,"cursor":"","count":50}),
                None,
            )
            .await
        }
    };
    let (created, collected, recent) = tokio::try_join!(
        created,
        pc(
            music,
            app,
            "/luna/pc/me/collection/mixed",
            json!({"cursor":"","count":50}),
            None
        ),
        pc(
            music,
            app,
            "/luna/pc/me/recently-played-media",
            json!({"cursor":"","count":50}),
            None
        )
    )?;
    let mut all = list(&created);
    all.extend(list(&collected).into_iter().filter(|item| {
        truth(&item["playlist_id"]) || truth(&item["playlist"]) || item["type"] == "playlist"
    }));
    for item in &mut all {
        if let Some(item) = item.as_object_mut() {
            item.entry("provider").or_insert(json!("qishui"));
            item.entry("type").or_insert(json!("playlist"));
        }
    }
    Ok(
        json!({"provider":"qishui","loggedIn":true,"profile":user,"playlists":all,"likedTracks":songs(&collected,true),"recentTracks":list(&recent).iter().map(track).collect::<Vec<_>>()}),
    )
}
async fn lyrics(music: &Music, app: &AppHandle, id: &str) -> Result<Value> {
    let mut payload = public(
        music,
        "https://beta-luna.douyin.com/luna/h5/seo_track",
        json!({"track_id":id,"device_platform":"web"}),
    )
    .await
    .ok();
    let mut auth = if payload.is_some() {
        "seo_track"
    } else {
        "none"
    };
    if payload.is_none() && logged_in(&session(app)) {
        payload = pc(
            music,
            app,
            "/luna/pc/track_v2",
            json!({"track_id":id,"media_type":"track"}),
            None,
        )
        .await
        .ok();
        if payload.is_some() {
            auth = "login";
        }
    }
    if payload.is_none() && public_enabled() {
        payload=Some(public(music,PUBLIC_CONTENT,json!({"sources":"qishui","need_author":true,"need_album":true,"need_ugc":true,"need_stat":true,"item_ids":id})).await?);
        auth = "public";
    }
    let payload = payload.unwrap_or(Value::Null);
    let data = data(&payload);
    let track = object_or(&data["track"], data);
    let lyric = pick(track, &["lyric_info", "lyric"]);
    let lyric = if lyric.is_null() {
        pick(data, &["lyric_info", "lyric"])
    } else {
        lyric
    };
    let translated = ["translated_lyric", "translation", "tlyric", "translations"]
        .iter()
        .find_map(|key| lyric.get(*key))
        .unwrap_or(&Value::Null);
    let translation = if translated.is_string() {
        text(translated)
    } else if let Some(values) = translated.as_array() {
        values
            .first()
            .map(|value| text(&value["content"]))
            .unwrap_or_default()
    } else {
        translated
            .as_object()
            .and_then(|values| {
                values
                    .values()
                    .find(|value| value.is_string() && !text(value).is_empty())
            })
            .map(text)
            .unwrap_or_default()
    };
    let content = text(pick(lyric, &["content", "lyric_text", "text"]));
    let content = if content.is_empty() {
        text(&lyric["lyric_entity"]["content"])
    } else {
        content
    };
    Ok(json!({"provider":"qishui","id":id,"auth":auth,"lyric":content,"tlyric":translation}))
}
fn membership(value: &Value) -> &'static str {
    fn contains(value: &Value, names: &[&str], positive: bool) -> bool {
        match value {
            Value::Object(value) => value.iter().any(|(key, value)| {
                (names.contains(&key.to_ascii_lowercase().as_str())
                    && if positive {
                        value == true || num(value, 0.) > 0.
                    } else {
                        value == false || value == 0
                    })
                    || contains(value, names, positive)
            }),
            Value::Array(values) => values.iter().any(|value| contains(value, names, positive)),
            _ => false,
        }
    }
    if contains(
        value,
        &["is_svip", "issvip", "svip", "sviplevel", "sviptype"],
        true,
    ) {
        "svip"
    } else if contains(
        value,
        &["is_vip", "isvip", "vip", "viplevel", "viptype"],
        true,
    ) {
        "vip"
    } else if contains(
        value,
        &["is_vip", "isvip", "vip", "viplevel", "viptype"],
        false,
    ) {
        "free"
    } else {
        "unknown"
    }
}
fn tier(stream: &Value) -> &'static str {
    let value =
        format!("{} {}", text(&stream["quality"]), text(&stream["bitrate"])).to_ascii_lowercase();
    if [
        "hi-res", "hi_res", "hires", "master", "atmos", "dolby", "spatial",
    ]
    .iter()
    .any(|key| value.contains(key))
    {
        "svip"
    } else if ["lossless", "flac", "320", "exhigh"]
        .iter()
        .any(|key| value.contains(key))
        || num(&stream["bitrate"], 0.) >= 300000.
    {
        "vip"
    } else {
        "free"
    }
}
fn allowed(tier: &str, membership: &str) -> bool {
    tier == "free"
        || (tier == "vip" && matches!(membership, "vip" | "svip"))
        || (tier == "svip" && membership == "svip")
}
fn streams(value: &Value) -> Vec<Value> {
    let data = data(value);
    let track = object_or(&data["track"], data);
    let audio = object_or(&track["audio_info"], &data["audio_info"]);
    let player = object_or(&data["track_player"], &data["trackPlayer"]);
    let auth = text(pick(player, &["spade_a", "play_auth"]));
    [&audio["play_info_list"],&audio["bit_rates"],&track["bit_rates"]].into_iter().filter_map(Value::as_array).flatten().filter_map(|item|{let url=text(pick(item,&["main_play_url","url","play_url","playable_url","backup_play_url"]));let url=if url.is_empty(){text(&item["url_list"][0])}else{url};if url.is_empty(){return None;};let own_auth=text(pick(item,&["play_auth","spade_a"]));Some(json!({"url":url,"auth":if own_auth.is_empty(){auth.clone()}else{own_auth},"quality":pick(item,&["quality","definition","format"]),"bitrate":num(pick(item,&["bitrate","bit_rate"]),0.),"duration":num(&item["duration"],0.)}))}).collect()
}
async fn song_url(music: &Music, app: &AppHandle, id: &str, quality: &str) -> Result<Value> {
    if !logged_in(&session(app)) {
        return Ok(
            json!({"provider":"qishui","playable":false,"playbackMode":"recommend-match","reason":"login_required","url":""}),
        );
    }
    let payload=match pc(music,app,"/luna/pc/track_v2",json!({}),Some(json!({"track_id":id,"media_type":"track","queue_type":"favorite_track_playlist","scene_name":"library"}))).await{Ok(value)=>value,Err(_)=>pc(music,app,"/luna/pc/track_v2",json!({"track_id":id,"media_type":"track"}),None).await?};
    let profile = pc(music, app, "/luna/pc/me", json!({}), None)
        .await
        .unwrap_or_else(|_| payload.clone());
    let membership = membership(&profile);
    let mut streams = streams(&payload);
    if !quality.is_empty() {
        streams.sort_by_key(|stream| {
            text(&stream["quality"]).to_lowercase() != quality.to_lowercase()
        });
    }
    let stream = streams
        .iter()
        .find(|stream| allowed(tier(stream), membership));
    let Some(stream) = stream else {
        let tier = streams.first().map(tier).unwrap_or("free");
        let reason = if streams.is_empty() {
            "source_unavailable"
        } else if membership == "unknown" {
            "membership_unknown"
        } else if tier == "svip" {
            "svip_required"
        } else {
            "vip_required"
        };
        return Ok(
            json!({"provider":"qishui","playable":false,"playbackMode":"recommend-match","loggedIn":true,"membershipKnown":membership!="unknown","vipLevel":membership,"requiredTier":tier,"reason":reason,"url":""}),
        );
    };
    let url = music
        .server(app)?
        .register(&text(&stream["url"]), &text(&stream["auth"]))?;
    Ok(
        json!({"provider":"qishui","playable":true,"playbackMode":"direct-url","loggedIn":true,"membershipKnown":membership!="unknown","vipLevel":membership,"requiredTier":tier(stream),"url":url,"encrypted":!text(&stream["auth"]).is_empty(),"quality":stream["quality"],"br":stream["bitrate"],"duration":stream["duration"],"requestedQuality":quality,"source":"qishui-pc-track-v2"}),
    )
}
async fn write(music: &Music, app: &AppHandle, path: &str, body: Value) -> Result<Value> {
    if !logged_in(&session(app)) {
        return Err("QISHUI_COOKIE_REQUIRED".into());
    }
    pc(music, app, path, json!({}), Some(body)).await?;
    Ok(json!({"provider":"qishui","ok":true}))
}
pub(super) async fn handle(
    music: &Music,
    app: &AppHandle,
    channel: &str,
    args: &[Value],
) -> Result<Value> {
    let first = args.first().unwrap_or(&Value::Null);
    let second = args.get(1).unwrap_or(&Value::Null);
    if channel == "qishui:status" {
        let logged = logged_in(&session(app));
        let token = !token(app).is_empty();
        let public = public_enabled();
        return Ok(
            json!({"provider":"qishui","configured":logged||token||public,"loggedIn":logged,"webSession":logged,"publicCatalog":public,"capabilities":{"search":public||token||logged,"feed":token||logged,"playlists":logged,"playback":logged,"lyrics":public||logged,"likeWrite":logged,"playlistWrite":logged,"comments":logged},"message":if logged{"汽水音乐业务会话已连接。"}else{"汽水音乐未登录，仅可使用公开目录匹配。"}}),
        );
    }
    match channel {
        "qishui:search" => search(music, app, &text(first), second).await,
        "qishui:feed" => feed(music, app, num(first, 8.).clamp(1., 18.) as usize).await,
        "qishui:playlists" => playlists(music, app).await,
        "qishui:playlist-tracks" => {
            let id = required(args.first(), "QISHUI_PLAYLIST_ID_REQUIRED")?;
            if !logged_in(&session(app)) {
                return Ok(
                    json!({"provider":"qishui","tracks":[],"error":"QISHUI_COOKIE_REQUIRED"}),
                );
            }
            let limit = num(&second["limit"], 50.);
            let payload=pc(music,app,"/luna/pc/playlist/detail",json!({"playlist_id":id.trim_start_matches("qishui:"),"cursor":second["cursor"].as_str().unwrap_or(""),"count":limit}),None).await?;
            let tracks = songs(&payload, false);
            let total = tracks.len();
            Ok(
                json!({"provider":"qishui","loggedIn":true,"playlistId":id,"tracks":tracks,"total":total,"hasMore":total as f64>=limit}),
            )
        }
        "qishui:lyrics" => {
            lyrics(
                music,
                app,
                &required(args.first(), "QISHUI_TRACK_ID_REQUIRED")?,
            )
            .await
        }
        "qishui:song-url" => {
            song_url(
                music,
                app,
                &required(args.first(), "QISHUI_TRACK_ID_REQUIRED")?,
                &text(second),
            )
            .await
        }
        "qishui:comments" => {
            let id = required(args.first(), "QISHUI_TRACK_ID_REQUIRED")?;
            let cursor = pick(second, &["cursor", "offset"]);
            let payload=pc(music,app,"/luna/pc/comments",json!({"group_id":id,"cursor":if cursor.is_null(){json!("")}else{cursor.clone()},"count":num(&second["limit"],20.),"group_type":0}),None).await?;
            Ok(json!({"provider":"qishui","id":id,"comments":list(&payload),"loggedIn":true}))
        }
        "qishui:create-comment" => {
            let id = required(args.first(), "QISHUI_TRACK_ID_REQUIRED")?;
            let content = required(args.get(1), "QISHUI_COMMENT_REQUIRED")?;
            let mut result = write(
                music,
                app,
                "/luna/pc/comments/create",
                json!({"group_id":id,"text":content,"group_type":0}),
            )
            .await?;
            result["id"] = json!(id);
            result["created"] = json!(true);
            Ok(result)
        }
        "qishui:check-liked" => {
            let ids = first.as_array().cloned().unwrap_or_default();
            let collection = playlists(music, app).await?;
            let known = collection["likedTracks"]
                .as_array()
                .map(|values| {
                    values
                        .iter()
                        .map(|value| text(pick(value, &["providerSongId", "id"])))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let liked: Map<String, Value> = ids
                .iter()
                .map(|id| (text(id), json!(known.contains(&text(id)))))
                .collect();
            Ok(json!({"provider":"qishui","ids":ids,"liked":liked,"complete":true}))
        }
        "qishui:like"
        | "qishui:collect-playlist"
        | "qishui:collect-album"
        | "qishui:recent-play" => {
            let id = required(
                args.first(),
                if channel == "qishui:collect-playlist" {
                    "QISHUI_PLAYLIST_ID_REQUIRED"
                } else if channel == "qishui:collect-album" {
                    "QISHUI_ALBUM_ID_REQUIRED"
                } else {
                    "QISHUI_TRACK_ID_REQUIRED"
                },
            )?;
            let enabled = second != false;
            let (base, body) = match channel {
                "qishui:like" => (
                    "/luna/pc/me/collection/media",
                    json!({"media":[{"type":"track","id":id}]}),
                ),
                "qishui:collect-playlist" => (
                    "/luna/pc/me/collection/playlist",
                    json!({"playlist_ids":[id]}),
                ),
                "qishui:collect-album" => {
                    ("/luna/pc/me/collection/album", json!({"album_ids":[id]}))
                }
                _ => (
                    "/luna/pc/me/recently-played-media",
                    json!({"media":[{"type":"track","id":id}]}),
                ),
            };
            let endpoint = if !enabled && channel != "qishui:recent-play" {
                format!("{base}/delete")
            } else {
                base.to_owned()
            };
            write(music, app, &endpoint, body).await
        }
        "qishui:add-song" => {
            let playlist = required(args.first(), "QISHUI_PLAYLIST_ID_REQUIRED")?;
            let track = required(args.get(1), "QISHUI_TRACK_ID_REQUIRED")?;
            write(
                music,
                app,
                "/luna/pc/playlist/media/append",
                json!({"playlist_id":playlist,"media":[{"id":track,"type":"track"}]}),
            )
            .await
        }
        _ => Err("Unsupported music operation".into()),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn normalization_keeps_ids_artists_and_duration_units() {
        let value = track(
            &json!({"entity":{"track":{"id":"123","name":"Track","duration":200,"artists":[{"name":"A"},{"name":"B"}]}}}),
        );
        assert_eq!(value["id"], "123");
        assert_eq!(value["artist"], "A / B");
        assert_eq!(value["duration"], 200000.);
    }
    #[test]
    fn account_and_membership_boundaries_are_preserved() {
        assert!(logged_in(&json!({"cookie":"a=b; sessionid=fixture"})));
        assert!(!logged_in(&json!({"cookie":"msToken=only"})));
        assert_eq!(membership(&json!({"data":{"is_vip":true}})), "vip");
        assert_eq!(membership(&json!({"is_vip":false})), "free");
        assert!(!allowed("svip", "vip"));
        assert!(!allowed("vip", "unknown"));
        assert!(allowed("free", "unknown"));
        assert_eq!(tier(&json!({"quality":"flac"})), "vip");
        assert_eq!(tier(&json!({"quality":"hi-res"})), "svip");
    }
}
