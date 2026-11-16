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

//! Windows 系统媒体会话，直接使用 WinRT。回调合并通知，监控线程统一读取快照。

use crate::shared::{time::now_ms, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    io::Cursor,
    sync::{
        atomic::{AtomicBool, AtomicU8, Ordering},
        mpsc::{self, Receiver, SyncSender},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use windows::{
    core::{Interface, RuntimeType},
    Foundation::TypedEventHandler,
    Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    },
    Storage::Streams::{DataReader, IRandomAccessStreamReference},
};
use windows_future::{AsyncOperationCompletedHandler, AsyncStatus, IAsyncOperation};

const MEDIA: u8 = 1;
const CLOCK: u8 = 2;
const TICKS_PER_SECOND: f64 = 10_000_000.;
const EPOCH_TICKS: i64 = 116_444_736_000_000_000;
const ARTWORK_BUDGET: usize = 4 * 1024 * 1024;
const READ_TIMEOUT: Duration = Duration::from_secs(1);

/// 阻塞线程上的 WinRT 操作必须有超时，避免卡住的播放器阻塞后续通知或媒体控制。
fn wait<T: RuntimeType>(
    task: windows::core::Result<IAsyncOperation<T>>,
    timeout: Duration,
) -> Result<T> {
    let task = task.map_err(|error| error.to_string())?;
    if task.Status().map_err(|error| error.to_string())? == AsyncStatus::Started {
        let (send, receive) = mpsc::sync_channel(1);
        task.SetCompleted(&AsyncOperationCompletedHandler::new(move |_, _| {
            let _ = send.try_send(());
            Ok(())
        }))
        .map_err(|error| error.to_string())?;
        if receive.recv_timeout(timeout).is_err() {
            let _ = task.Cancel();
            return Err("SMTC operation timed out".into());
        }
    }
    task.GetResults().map_err(|error| error.to_string())
}

fn read_artwork(reference: &IRandomAccessStreamReference) -> Option<String> {
    let stream = wait(reference.OpenReadAsync(), READ_TIMEOUT).ok()?;
    let size = stream.Size().ok()?;
    if size == 0 || size > 8 * 1024 * 1024 {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0).ok()?).ok()?;
    let load = reader
        .LoadAsync(size as u32)
        .and_then(|op| op.cast::<IAsyncOperation<u32>>());
    if wait(load, READ_TIMEOUT).ok()? != size as u32 {
        return None;
    }
    let mut bytes = vec![0; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;
    let mut image_reader = image::ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .ok()?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(64 * 1024 * 1024);
    image_reader.limits(limits);
    let image = image_reader.decode().ok()?;
    let cover = if image.width() > 256 || image.height() > 256 {
        image.thumbnail(256, 256)
    } else {
        image
    };
    let mut png = Cursor::new(Vec::new());
    cover.write_to(&mut png, image::ImageFormat::Png).ok()?;
    Some(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(png.into_inner())
    ))
}

fn read_media(session: &Session, artwork: bool) -> Result<(Value, Option<String>)> {
    let props = wait(session.TryGetMediaPropertiesAsync(), READ_TIMEOUT)?;
    let metadata = json!({
        "title": props.Title().unwrap_or_default().to_string_lossy(),
        "artist": props.Artist().unwrap_or_default().to_string_lossy(),
        "albumTitle": props.AlbumTitle().unwrap_or_default().to_string_lossy(),
    });
    let cover = if artwork {
        props.Thumbnail().ok().as_ref().and_then(read_artwork)
    } else {
        None
    };
    Ok((metadata, cover))
}

#[derive(Clone, Copy, PartialEq)]
struct RawTimeline {
    position: i64,
    start: i64,
    end: i64,
    updated: i64,
}

#[derive(Default)]
struct TimelineClock {
    previous: Option<(RawTimeline, f64, u64, bool, f64)>,
}

impl TimelineClock {
    /// 同一原始位置在暂停或变速时先按旧速率推进，再切换播放状态。
    fn sample(&mut self, raw: RawTimeline, now: u64, playing: bool, rate: f64) -> f64 {
        let start = raw.start as f64 / TICKS_PER_SECOND;
        let end = raw.end as f64 / TICKS_PER_SECOND;
        let (position, updated, was_playing, old_rate) = match self.previous {
            Some((previous, position, sampled, was_playing, rate)) if previous == raw => {
                (position, sampled, was_playing, rate)
            }
            _ => (
                raw.position as f64 / TICKS_PER_SECOND,
                raw.updated
                    .checked_sub(EPOCH_TICKS)
                    .filter(|ticks| *ticks > 0)
                    .map(|ticks| ticks as u64 / 10_000)
                    .unwrap_or(now),
                playing,
                rate,
            ),
        };
        let elapsed = now.saturating_sub(updated) as f64 / 1000.;
        let mut position =
            (position + if was_playing { elapsed * old_rate } else { 0. }).max(start);
        if end > start {
            position = position.min(end);
        }
        self.previous = Some((raw, position, now, playing, rate));
        position
    }
}

fn read_clock(session: &Session, clock: &mut TimelineClock) -> (Value, Value) {
    let Ok(info) = session.GetPlaybackInfo() else {
        return (Value::Null, Value::Null);
    };
    let status = info.PlaybackStatus().ok();
    let rate = info
        .PlaybackRate()
        .ok()
        .and_then(|value| value.Value().ok())
        .filter(|value| value.is_finite() && *value >= 0.);
    let timeline = (|| {
        let properties = session.GetTimelineProperties().ok()?;
        let raw = RawTimeline {
            position: properties.Position().ok()?.Duration,
            start: properties.StartTime().ok()?.Duration,
            end: properties.EndTime().ok()?.Duration,
            updated: properties
                .LastUpdatedTime()
                .ok()
                .map_or(0, |time| time.UniversalTime),
        };
        let now = now_ms();
        let position = clock.sample(
            raw,
            now,
            status == Some(Status::Playing),
            rate.unwrap_or(1.),
        );
        let seconds = |ticks| ticks as f64 / TICKS_PER_SECOND;
        Some(json!({
            "position": position, "sampledAtMs": now,
            "duration": (seconds(raw.end) - seconds(raw.start)).max(0.),
            "startTime": seconds(raw.start), "endTime": seconds(raw.end),
            "minSeekTime": properties.MinSeekTime().ok().map(|time| seconds(time.Duration)),
            "maxSeekTime": properties.MaxSeekTime().ok().map(|time| seconds(time.Duration)),
        }))
    })();
    (
        json!({"playbackStatus":status.map(|status| status.0),"playbackRate":rate}),
        json!(timeline),
    )
}

struct Subscription {
    session: Session,
    events: [Option<i64>; 3],
    dirty: Arc<AtomicU8>,
    clock: TimelineClock,
}

impl Subscription {
    fn new(session: Session, wake: &SyncSender<()>) -> windows::core::Result<Self> {
        let mut subscription = Self {
            session,
            events: [None; 3],
            dirty: Arc::new(AtomicU8::new(MEDIA | CLOCK)),
            clock: TimelineClock::default(),
        };
        let notify = || {
            let dirty = subscription.dirty.clone();
            let wake = wake.clone();
            move |flags| {
                dirty.fetch_or(flags, Ordering::Release);
                let _ = wake.try_send(());
            }
        };
        let media = notify();
        let playback = notify();
        let timeline = notify();
        subscription.events[0] = Some(subscription.session.MediaPropertiesChanged(
            &TypedEventHandler::new(move |_, _| {
                media(MEDIA);
                Ok(())
            }),
        )?);
        subscription.events[1] = Some(subscription.session.PlaybackInfoChanged(
            &TypedEventHandler::new(move |_, _| {
                playback(CLOCK);
                Ok(())
            }),
        )?);
        subscription.events[2] = Some(subscription.session.TimelinePropertiesChanged(
            &TypedEventHandler::new(move |_, _| {
                timeline(CLOCK);
                Ok(())
            }),
        )?);
        Ok(subscription)
    }
}

impl Drop for Subscription {
    fn drop(&mut self) {
        if let Some(token) = self.events[0] {
            let _ = self.session.RemoveMediaPropertiesChanged(token);
        }
        if let Some(token) = self.events[1] {
            let _ = self.session.RemovePlaybackInfoChanged(token);
        }
        if let Some(token) = self.events[2] {
            let _ = self.session.RemoveTimelinePropertiesChanged(token);
        }
    }
}

#[derive(Default)]
pub(crate) struct Api {
    snapshots: Mutex<BTreeMap<String, (Session, Value)>>,
}

impl Api {
    /// 返回已缓存的完整快照；读取者不会等待播放器的异步封面查询。
    pub(crate) fn snapshot(&self) -> Vec<Value> {
        self.snapshots
            .lock()
            .unwrap()
            .values()
            .map(|(_, value)| value.clone())
            .collect()
    }

    /// 为过期后收到增量的会话恢复完整快照。
    pub(crate) fn session_snapshot(&self, source: &str) -> Option<Value> {
        self.snapshots
            .lock()
            .unwrap()
            .get(source)
            .map(|(_, value)| value.clone())
    }

    /// 对应用选中的精确会话发出媒体指令。
    pub(crate) fn command(&self, source: &str, name: &str, value: Option<f64>) -> Result<()> {
        let _apartment = super::ComApartment::enter().ok_or("Cannot initialize SMTC COM")?;
        let session = self
            .snapshots
            .lock()
            .unwrap()
            .get(source)
            .map(|(session, _)| session.clone())
            .ok_or("No active media session")?;
        let operation = match name {
            "play" => session.TryPlayAsync(),
            "pause" => session.TryPauseAsync(),
            "next" => session.TrySkipNextAsync(),
            "previous" => session.TrySkipPreviousAsync(),
            "seek" => {
                let seconds = value
                    .filter(|value| {
                        value.is_finite()
                            && *value >= 0.
                            && *value < i64::MAX as f64 / TICKS_PER_SECOND
                    })
                    .ok_or("Invalid seek position")?;
                session.TryChangePlaybackPositionAsync((seconds * TICKS_PER_SECOND).round() as i64)
            }
            _ => return Err("Unknown media command".into()),
        };
        if wait(operation, Duration::from_secs(3))? {
            Ok(())
        } else {
            Err(format!("SMTC {name} was rejected by the media session"))
        }
    }
}

pub(crate) struct Monitor {
    subscriptions: BTreeMap<String, Subscription>,
    manager: Manager,
    sessions_changed: i64,
    topology_dirty: Arc<AtomicBool>,
    topology_sampled: Option<Instant>,
    wake: SyncSender<()>,
    receiver: Receiver<()>,
    api: Arc<Api>,
    _apartment: super::ComApartment,
}

impl Monitor {
    /// 必须在监控线程创建并销毁，确保 WinRT 事件注销先于 COM 退出。
    pub(crate) fn open() -> Result<Self> {
        let apartment = super::ComApartment::enter().ok_or("Cannot initialize SMTC COM")?;
        let manager = wait(Manager::RequestAsync(), Duration::from_secs(4))?;
        let (wake, receiver) = mpsc::sync_channel(1);
        let topology_dirty = Arc::new(AtomicBool::new(true));
        let dirty = topology_dirty.clone();
        let notify = wake.clone();
        let sessions_changed = manager
            .SessionsChanged(&TypedEventHandler::new(move |_, _| {
                dirty.store(true, Ordering::Release);
                let _ = notify.try_send(());
                Ok(())
            }))
            .map_err(|error| error.to_string())?;
        Ok(Self {
            subscriptions: BTreeMap::new(),
            manager,
            sessions_changed,
            topology_dirty,
            topology_sampled: None,
            wake,
            receiver,
            api: Arc::new(Api::default()),
            _apartment: apartment,
        })
    }

    pub(crate) fn api(&self) -> Arc<Api> {
        self.api.clone()
    }

    fn sync_sessions(&mut self, changes: &mut Vec<Value>) -> Result<()> {
        let sessions = self
            .manager
            .GetSessions()
            .map_err(|error| error.to_string())?;
        let mut current = BTreeMap::new();
        for session in sessions {
            if let Ok(id) = session.SourceAppUserModelId() {
                if !id.is_empty() {
                    current.entry(id.to_string_lossy()).or_insert(session);
                }
            }
        }
        self.subscriptions.retain(|id, subscription| {
            let next = current.get(id);
            if next == Some(&subscription.session) {
                return true;
            }
            if next.is_none() {
                self.api.snapshots.lock().unwrap().remove(id);
                changes.push(json!({"sourceAppId":id,"removed":true}));
            }
            false
        });
        for (id, session) in current {
            if !self.subscriptions.contains_key(&id) {
                match Subscription::new(session, &self.wake) {
                    Ok(subscription) => {
                        self.subscriptions.insert(id, subscription);
                    }
                    Err(error) => eprintln!("[SMTC] Cannot subscribe to {id}: {error}"),
                }
            }
        }
        Ok(())
    }

    /// 仅为收到事件的会话读取属性，播放进度事件不重新读取封面。
    pub(crate) fn refresh(&mut self) -> Result<Vec<Value>> {
        let mut changes = Vec::new();
        if self.topology_dirty.swap(false, Ordering::AcqRel)
            || self
                .topology_sampled
                .is_none_or(|sample| sample.elapsed() >= Duration::from_secs(5))
        {
            self.topology_sampled = Some(Instant::now());
            self.sync_sessions(&mut changes)?;
        }
        for (id, watched) in &mut self.subscriptions {
            let flags = watched.dirty.swap(0, Ordering::AcqRel);
            if flags == 0 {
                continue;
            }
            let media = (flags & MEDIA != 0)
                .then(|| read_media(&watched.session, true).ok())
                .flatten();
            let (playback, timeline) = read_clock(&watched.session, &mut watched.clock);
            let delta = self
                .api
                .update(id, &watched.session, media, playback, timeline);
            changes.push(delta);
        }
        Ok(changes)
    }

    pub(crate) fn wait_for_changes(&mut self) -> Result<Vec<Value>> {
        let _ = self.receiver.recv_timeout(Duration::from_millis(250));
        self.refresh()
    }
}

impl Drop for Monitor {
    fn drop(&mut self) {
        let _ = self.manager.RemoveSessionsChanged(self.sessions_changed);
        self.subscriptions.clear();
        self.api.snapshots.lock().unwrap().clear();
    }
}

impl Api {
    fn update(
        &self,
        id: &str,
        session: &Session,
        media: Option<(Value, Option<String>)>,
        playback: Value,
        timeline: Value,
    ) -> Value {
        let mut entries = self.snapshots.lock().unwrap();
        let mut delta = json!({"sourceAppId":id,"playback":playback,"timeline":timeline});
        let media = media.map(|(metadata, cover)| {
            let used: usize = entries
                .iter()
                .filter(|(source, _)| source.as_str() != id)
                .filter_map(|(_, (_, snapshot))| snapshot["media"]["thumbnail"].as_str())
                .map(str::len)
                .sum();
            let cover = cover.filter(|image| used + image.len() <= ARTWORK_BUDGET);
            (metadata, cover)
        });
        let (current, snapshot) = entries
            .entry(id.into())
            .or_insert_with(|| (session.clone(), json!({"sourceAppId":id})));
        let replaced = current != session;
        if replaced {
            *current = session.clone();
            snapshot["media"] = Value::Null;
            snapshot["timeline"] = Value::Null;
        }
        if let Some((metadata, cover)) = media {
            delta["mediaChanged"] = json!(true);
            delta["media"] = metadata.clone();
            let cover = json!(cover);
            if replaced || snapshot["media"]["thumbnail"] != cover {
                delta["artworkChanged"] = json!(true);
                delta["thumbnail"] = cover.clone();
            }
            snapshot["media"] = metadata;
            snapshot["media"]["thumbnail"] = cover;
        } else if replaced {
            delta["mediaChanged"] = json!(true);
            delta["artworkChanged"] = json!(true);
        }
        snapshot["playback"] = playback;
        if !timeline.is_null() || replaced {
            snapshot["timeline"] = timeline;
        }
        delta
    }
}

/// 开发 CLI 读取会话的轻量快照，不解码封面，无需启动桌面窗口。
pub(crate) fn list_sessions() -> Result<Vec<Value>> {
    let _apartment = super::ComApartment::enter().ok_or("Cannot initialize SMTC COM")?;
    let manager = wait(Manager::RequestAsync(), Duration::from_secs(4))?;
    let sessions = manager.GetSessions().map_err(|error| error.to_string())?;
    let mut result = Vec::new();
    for session in sessions {
        let id = session.SourceAppUserModelId().unwrap_or_default();
        if id.is_empty() {
            continue;
        }
        let media = read_media(&session, false)
            .ok()
            .map(|(metadata, _)| metadata);
        let (playback, timeline) = read_clock(&session, &mut TimelineClock::default());
        result.push(json!({"sourceAppId":id.to_string_lossy(),"media":media,"playback":playback,"timeline":timeline}));
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pause_without_a_new_timeline_preserves_the_projected_position() {
        let raw = RawTimeline {
            position: 10_000_000,
            start: 0,
            end: 100_000_000,
            updated: EPOCH_TICKS + 10_000_000,
        };
        let mut clock = TimelineClock::default();
        assert_eq!(clock.sample(raw, 2000, true, 2.), 3.);
        assert_eq!(clock.sample(raw, 3000, false, 2.), 5.);
        assert_eq!(clock.sample(raw, 5000, false, 2.), 5.);
        assert_eq!(clock.sample(raw, 6000, true, 1.), 5.);
        assert_eq!(clock.sample(raw, 20000, true, 1.), 10.);
    }
}
