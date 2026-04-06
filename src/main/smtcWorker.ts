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

/**
 * @file smtcWorker.ts
 * @description SMTC 媒体监听 Worker 线程，运行 SMTCMonitor 并将会话变更推送至主进程
 * @author 鸡哥
 */

import { parentPort } from 'worker_threads';
import { SMTCMonitor } from '@coooookies/windows-smtc-monitor';

if (!parentPort) throw new Error('smtcWorker must be run as a Worker thread');

/** 媒体属性 */
interface MediaProps {
  title: string;
  artist: string;
  albumTitle: string;
  albumArtist: string;
  genres: string[];
  albumTrackCount: number;
  trackNumber: number;
  thumbnail: Buffer | null;
}

/** 播放状态属性 */
interface PlaybackInfo {
  playbackStatus: number;
  playbackType: number;
}

/** 时间线属性（秒） */
interface TimelineProps {
  position: number;
  duration: number;
}

/** Worker 本地会话缓存条目 */
interface CacheEntry {
  media: MediaProps | null;
  playback: PlaybackInfo | null;
  timeline: TimelineProps | null;
}

/** SMTCMonitor.getMediaSessions() 返回的单条会话结构 */
interface RawSession {
  sourceAppId: string;
  media: MediaProps;
  playback: PlaybackInfo;
  timeline: TimelineProps;
}

/** 会话本地缓存（以 sourceAppId 为键） */
const sessionCache = new Map<string, CacheEntry>();

/**
 * 将缩略图 Buffer 转换为 base64 data URL
 * @param buf - 原始图片 Buffer（BMP 或 PNG）
 * @returns data URL 字符串，或 null
 */
function thumbnailToDataUrl(buf: Buffer | null | undefined): string | null {
  if (!buf || buf.length === 0) return null;
  const mime = (buf[0] === 0x42 && buf[1] === 0x4d) ? 'image/bmp' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * 序列化当前缓存中的会话并通过 parentPort 推送给主进程
 * @param sourceAppId - 应用会话 ID
 */
function postSessionUpdate(sourceAppId: string): void {
  const entry = sessionCache.get(sourceAppId);
  if (!entry) return;

  const { media, playback, timeline } = entry;
  parentPort!.postMessage({
    type: 'session-update',
    sourceAppId,
    session: {
      media: media ? {
        title: media.title,
        artist: media.artist,
        albumTitle: media.albumTitle,
        thumbnail: thumbnailToDataUrl(media.thumbnail),
      } : null,
      playback,
      timeline,
    },
  });
}

const smtc = new SMTCMonitor();
const smtcAny = smtc as unknown as {
  on(event: string, listener: (...args: unknown[]) => void): void;
};

smtcAny.on('session-added', (sourceAppId: unknown, mediaProps: unknown) => {
  const appId = sourceAppId as string;
  const props = mediaProps as MediaProps;
  sessionCache.set(appId, { media: props, playback: null, timeline: null });
  postSessionUpdate(appId);
});

smtcAny.on('session-removed', (sourceAppId: unknown) => {
  const appId = sourceAppId as string;
  sessionCache.delete(appId);
  parentPort!.postMessage({ type: 'session-removed', sourceAppId: appId });
});

smtcAny.on('session-media-changed', (sourceAppId: unknown, mediaProps: unknown) => {
  const appId = sourceAppId as string;
  const existing = sessionCache.get(appId) ?? { media: null, playback: null, timeline: null };
  sessionCache.set(appId, { ...existing, media: mediaProps as MediaProps });
  postSessionUpdate(appId);
});

smtcAny.on('session-playback-changed', (sourceAppId: unknown, playbackInfo: unknown) => {
  const appId = sourceAppId as string;
  const existing = sessionCache.get(appId) ?? { media: null, playback: null, timeline: null };
  sessionCache.set(appId, { ...existing, playback: playbackInfo as PlaybackInfo });
  postSessionUpdate(appId);
});

smtcAny.on('session-timeline-changed', (sourceAppId: unknown, timelineProps: unknown) => {
  const appId = sourceAppId as string;
  const existing = sessionCache.get(appId) ?? { media: null, playback: null, timeline: null };
  sessionCache.set(appId, { ...existing, timeline: timelineProps as TimelineProps });
  postSessionUpdate(appId);
});

/** 初始化：读取当前已存在的会话并推送快照 */
try {
  const initialSessions = SMTCMonitor.getMediaSessions() as RawSession[];
  initialSessions.forEach((s) => {
    sessionCache.set(s.sourceAppId, {
      media: s.media,
      playback: s.playback,
      timeline: s.timeline,
    });
    postSessionUpdate(s.sourceAppId);
  });
} catch {
  // 初始化读取失败时忽略，依赖后续事件驱动更新
}
