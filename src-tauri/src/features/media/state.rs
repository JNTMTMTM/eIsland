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
use std::collections::BTreeMap;

use crate::shared::time::now_ms;
pub fn playing(session: &Value) -> bool {
    session["playback"]["playbackStatus"] == 4
}
fn titled(session: &Value) -> bool {
    session["media"]["title"]
        .as_str()
        .is_some_and(|s| !s.is_empty())
}
pub struct Sessions {
    pub entries: BTreeMap<String, Value>,
    pub current: String,
    pub pending: String,
    pub whitelist: Vec<String>,
    pub error: Option<String>,
    last_seen: BTreeMap<String, u64>,
    unsubscribe_ms: u64,
    last_cleanup_at: u64,
}
impl Sessions {
    pub fn new(whitelist: Vec<String>) -> Self {
        Self {
            entries: BTreeMap::new(),
            current: String::new(),
            pending: String::new(),
            whitelist,
            error: None,
            last_seen: BTreeMap::new(),
            unsubscribe_ms: 0,
            last_cleanup_at: 0,
        }
    }
    fn allowed(&self, id: &str) -> bool {
        self.whitelist
            .iter()
            .any(|s| !s.is_empty() && id.to_lowercase().contains(&s.to_lowercase()))
    }
    pub fn set_unsubscribe_ms(&mut self, milliseconds: u64) {
        self.unsubscribe_ms = milliseconds;
    }
    pub fn apply(&mut self, changes: &[Value], full: bool) {
        self.apply_at(changes, full, now_ms());
    }
    pub fn apply_at(&mut self, changes: &[Value], full: bool, now: u64) {
        if full {
            self.entries.clear();
            self.last_seen.clear();
            self.last_cleanup_at = now;
        } else if self.unsubscribe_ms > 0 && now.saturating_sub(self.last_cleanup_at) >= 30_000 {
            // Match the original runtime cache TTL. The DLL remains subscribed, and no
            // wall-clock timer clears a paused track while no media event is arriving.
            self.last_cleanup_at = now;
            let refreshed: std::collections::BTreeSet<_> = changes
                .iter()
                .filter(|change| change["removed"] != true)
                .filter_map(|change| change["sourceAppId"].as_str())
                .collect();
            self.entries.retain(|id, _| {
                refreshed.contains(id.as_str())
                    || self
                        .last_seen
                        .get(id)
                        .is_some_and(|seen| now.saturating_sub(*seen) <= self.unsubscribe_ms)
            });
            self.last_seen.retain(|id, _| self.entries.contains_key(id));
        }
        for change in changes {
            let Some(id) = change["sourceAppId"].as_str() else {
                continue;
            };
            if change["removed"] == true {
                self.entries.remove(id);
                self.last_seen.remove(id);
                continue;
            }
            self.last_seen.insert(id.to_owned(), now);
            if full {
                self.entries.insert(id.into(), change.clone());
                continue;
            }
            let entry = self
                .entries
                .entry(id.into())
                .or_insert_with(|| json!({"sourceAppId":id}));
            if change["mediaChanged"] == true {
                let artwork = entry["media"]["thumbnail"].clone();
                entry["media"] = change["media"].clone();
                if entry["media"].is_object() {
                    entry["media"]["thumbnail"] = artwork;
                }
            }
            if change["artworkChanged"] == true && entry["media"].is_object() {
                entry["media"]["thumbnail"] = change["thumbnail"].clone();
            }
            entry["playback"] = change["playback"].clone();
            if !change["timeline"].is_null() {
                entry["timeline"] = change["timeline"].clone();
            }
        }
        self.select();
    }
    pub fn select(&mut self) {
        if !self.allowed(&self.current) || !self.entries.get(&self.current).is_some_and(titled) {
            self.current.clear();
        }
        if !self.entries.contains_key(&self.pending) || !self.allowed(&self.pending) {
            self.pending.clear();
        }
        let candidate = self
            .entries
            .iter()
            .filter(|(id, s)| self.allowed(id) && titled(s))
            .max_by_key(|(id, s)| (playing(s), *id == &self.current))
            .map(|(id, _)| id.clone());
        if let Some(candidate) = candidate {
            let current_playing = self.entries.get(&self.current).is_some_and(playing);
            if self.current.is_empty() || !current_playing {
                self.current = candidate;
                self.pending.clear();
            } else if candidate != self.current && self.entries.get(&candidate).is_some_and(playing)
            {
                self.pending = candidate;
            }
        }
        if self.entries.get(&self.current).is_some_and(playing) && self.pending.is_empty() {
            if let Some((id, _)) = self
                .entries
                .iter()
                .find(|(id, s)| *id != &self.current && self.allowed(id) && titled(s) && playing(s))
            {
                self.pending = id.clone();
            }
        }
    }
    pub fn payload(&self) -> Value {
        self.payload_with_artwork(true)
    }
    pub fn summary(&self) -> Value {
        self.payload_with_artwork(false)
    }
    fn payload_with_artwork(&self, artwork: bool) -> Value {
        let Some(session) = self.entries.get(&self.current).filter(|s| titled(s)) else {
            return Value::Null;
        };
        let timeline = &session["timeline"];
        let media = &session["media"];
        let playback = &session["playback"];
        let mut payload = json!({
            "title":media["title"].as_str().unwrap_or(""), "artist":media["artist"].as_str().unwrap_or(""),
            "album":media["albumTitle"].as_str().unwrap_or(""),
            "duration_ms":(timeline["duration"].as_f64().unwrap_or(0.) * 1000.).round(),
            "position_ms":(timeline["position"].as_f64().unwrap_or(0.) * 1000.).round(),
            "positionTimestampMs":timeline["sampledAtMs"].as_u64().unwrap_or_else(now_ms),
            "playbackRate":playback["playbackRate"].as_f64().filter(|v|v.is_finite() && *v >= 0.).unwrap_or(1.),
            "isPlaying":playing(session), "deviceId":self.current,
            "canFastForward":false,"canSkip":false,"canLike":false,"canChangeVolume":false,"canSetOutput":false,
        });
        if artwork {
            payload["thumbnail"] = media["thumbnail"].clone();
        }
        payload
    }
    pub fn timestamp(&self) -> Value {
        let Some(session) = self
            .entries
            .get(&self.current)
            .filter(|s| !s["timeline"].is_null())
        else {
            return json!({"isAvailable":false,"playbackStatus":"unknown","timeline":null});
        };
        let timeline = &session["timeline"];
        let status = match session["playback"]["playbackStatus"].as_u64() {
            Some(0) => "closed",
            Some(1) => "opened",
            Some(2) => "changing",
            Some(3) => "stopped",
            Some(4) => "playing",
            Some(5) => "paused",
            _ => "unknown",
        };
        json!({"isAvailable":true,"playbackStatus":status,"playbackRate":session["playback"]["playbackRate"],"sourceAppUserModelId":self.current,
            "timeline":{"startTime":0,"endTime":timeline["duration"],"position":timeline["position"],"minSeekTime":0,"maxSeekTime":timeline["duration"],"sampledAtMs":timeline["sampledAtMs"]}})
    }
    pub fn sources(&self) -> Vec<Value> {
        self.entries.iter().map(|(id,s)|json!({"sourceAppId":id,"isPlaying":playing(s),"hasTitle":titled(s),"thumbnail":s["media"]["thumbnail"]})).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn session(id: &str, status: u8) -> Value {
        json!({"sourceAppId":id,"media":{"title":"Track","artist":"Artist","thumbnail":"cover"},"playback":{"playbackStatus":status,"playbackRate":1},"timeline":{"duration":30,"position":2,"sampledAtMs":12345}})
    }
    #[test]
    fn deltas_keep_artwork_and_clock_and_filter_unlisted_sources() {
        let mut s = Sessions::new(vec!["music".into()]);
        s.apply(&[session("music.exe", 4), session("browser", 4)], true);
        s.apply(&[json!({"sourceAppId":"music.exe","mediaChanged":false,"artworkChanged":false,"playback":{"playbackStatus":5}})],false);
        let p = s.payload();
        assert_eq!(p["thumbnail"], "cover");
        assert_eq!(p["position_ms"], 2000.);
        assert_eq!(p["positionTimestampMs"], 12345);
        assert_eq!(p["isPlaying"], false);
        assert_eq!(s.sources().len(), 2);
        assert_eq!(s.timestamp()["timeline"]["position"], 2);
        s.apply(&[json!({"sourceAppId":"music.exe","removed":true})], false);
        assert!(s.payload().is_null());
    }
    #[test]
    fn paused_initial_session_is_visible() {
        let mut s = Sessions::new(vec!["music".into()]);
        s.apply(&[session("music", 5)], true);
        assert_eq!(s.payload()["title"], "Track");
        assert_eq!(s.timestamp()["playbackStatus"], "paused");
    }
    #[test]
    fn new_playing_source_requires_confirmation_while_current_keeps_playing() {
        let mut s = Sessions::new(vec!["music".into()]);
        s.apply(&[session("music-a", 4)], true);
        let mut next = session("music-b", 4);
        next["mediaChanged"] = json!(true);
        next["artworkChanged"] = json!(true);
        next["thumbnail"] = json!("new-cover");
        s.apply(&[next], false);
        assert_eq!(s.current, "music-a");
        assert_eq!(s.pending, "music-b");
        s.apply(&[json!({"sourceAppId":"music-a","removed":true})], false);
        assert_eq!(s.current, "music-b");
        assert!(s.pending.is_empty());
    }
    #[test]
    fn zero_ttl_keeps_other_sessions_without_activity() {
        let mut sessions = Sessions::new(vec!["music".into()]);
        sessions.apply_at(&[session("music-a", 5), session("music-b", 5)], true, 1_000);
        sessions.apply_at(
            &[json!({"sourceAppId":"music-a","playback":{"playbackStatus":5}})],
            false,
            100_000_000,
        );
        assert_eq!(sessions.entries.len(), 2);
        assert_eq!(sessions.payload()["title"], "Track");
    }
    #[test]
    fn ttl_prunes_stale_cache_but_preserves_refreshed_paused_metadata() {
        let mut sessions = Sessions::new(vec!["music".into()]);
        sessions.set_unsubscribe_ms(1_000);
        sessions.apply_at(&[session("music-a", 5), session("music-b", 4)], true, 1_000);
        sessions.current = "music-a".into();
        sessions.pending = "music-b".into();
        sessions.apply_at(&[json!({"sourceAppId":"music-a","mediaChanged":false,"artworkChanged":false,"playback":{"playbackStatus":5}})],false,31_001);
        assert_eq!(sessions.entries.len(), 1);
        assert_eq!(sessions.current, "music-a");
        assert!(sessions.pending.is_empty());
        assert_eq!(sessions.payload()["title"], "Track");
        assert_eq!(sessions.payload()["thumbnail"], "cover");
        assert_eq!(sessions.payload()["position_ms"], 2000.);
    }
    #[test]
    fn ttl_obeys_cleanup_interval_and_setting_can_be_disabled() {
        let mut sessions = Sessions::new(vec!["music".into()]);
        sessions.set_unsubscribe_ms(1_000);
        sessions.apply_at(&[session("music-a", 5), session("music-b", 4)], true, 1_000);
        let delta = json!({"sourceAppId":"music-a","playback":{"playbackStatus":5}});
        sessions.apply_at(std::slice::from_ref(&delta), false, 30_000);
        assert_eq!(sessions.entries.len(), 2);
        sessions.set_unsubscribe_ms(0);
        sessions.apply_at(&[delta], false, 99_000);
        assert_eq!(sessions.entries.len(), 2);
    }
    #[test]
    fn expired_current_source_can_return_with_recovered_metadata() {
        let mut sessions = Sessions::new(vec!["music".into()]);
        sessions.set_unsubscribe_ms(1_000);
        sessions.apply_at(&[session("music-a", 4)], true, 1_000);
        let mut second = session("music-b", 4);
        second["mediaChanged"] = json!(true);
        second["artworkChanged"] = json!(true);
        second["thumbnail"] = json!("cover-b");
        sessions.apply_at(&[second], false, 31_001);
        assert_eq!(sessions.current, "music-b");
        assert!(!sessions.entries.contains_key("music-a"));
        let mut recovered = session("music-a", 4);
        recovered["mediaChanged"] = json!(true);
        recovered["artworkChanged"] = json!(true);
        recovered["thumbnail"] = json!("cover");
        sessions.apply_at(&[recovered], false, 61_002);
        assert_eq!(sessions.current, "music-a");
        assert_eq!(sessions.payload()["title"], "Track");
        assert_eq!(sessions.payload()["thumbnail"], "cover");
    }
}
