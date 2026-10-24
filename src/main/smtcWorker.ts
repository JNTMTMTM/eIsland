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
 * @description SMTC 媒体监听 Worker 线程，运行 SmtcMonitor 并将会话变更推送至主进程
 * @author 鸡哥
 */

import { parentPort } from 'worker_threads';
import { join } from 'node:path';
import { createSmtcCommandBroker } from './music/smtcCommandBroker';
import type { SmtcCommandRequest } from './music/smtcCommandProtocol';
import { SmtcMonitor, type MediaProps, type PlaybackInfo, type TimelineProps } from '@eisland/windows-smtc-helper';

if (!parentPort) throw new Error('smtcWorker must be run as a Worker thread');

/** Worker 本地会话缓存条目 */
interface CacheEntry {
  media: MediaProps | null;
  playback: PlaybackInfo | null;
  timeline: TimelineProps | null;
}

/** 会话本地缓存（以 sourceAppId 为键） */
const sessionCache = new Map<string, CacheEntry>();

/**
 * 序列化当前缓存中的会话并通过 parentPort 推送给主进程
 * @param sourceAppId - 应用会话 ID
 */
function postSessionUpdate(sourceAppId: string, includeThumbnail = true): void {
  const entry = sessionCache.get(sourceAppId);
  if (!entry) return;

  const { media, playback, timeline } = entry;
  const mediaPayload = media ? {
    title: media.title,
    artist: media.artist,
    albumTitle: media.albumTitle,
    ...(includeThumbnail ? { thumbnail: media.thumbnail } : {}),
  } : null;

  parentPort!.postMessage({
    type: 'session-update',
    sourceAppId,
    session: {
      media: mediaPayload,
      playback,
      timeline,
    },
  });
}

const smtc = new SmtcMonitor();
const commands = createSmtcCommandBroker(join(__dirname, 'smtcCommandWorker.js'));

/** 原生监控启动后在后台线程枚举现有会话，首批新增会话即启动时已存在的播放源 */
let initialSessionsPending = true;

/**
 * 首批新增会话推送完后通知主进程，使其在没有正在播放的源时也能选中暂停的源
 * @description 同一次增量合并的事件同步派发，微任务在整批会话推送完成后才执行
 */
function markInitialSessions(): void {
  if (!initialSessionsPending) return;
  initialSessionsPending = false;
  queueMicrotask(() => parentPort!.postMessage({ type: 'initial-sessions-ready' }));
}


smtc.on('session-added', (sourceAppId: string, mediaProps: MediaProps) => {
  const entry: CacheEntry = { media: mediaProps, playback: null, timeline: null };

  /**
   * 刷新 playback / timeline，避免自动连播时缓存的播放状态过期（fix #41）
   * @docs https://github.com/JNTMTMTM/eIsland/issues/41
   */
  try {
    const fresh = smtc.getCachedSession(sourceAppId);
    if (fresh) {
      entry.playback = fresh.playback;
      entry.timeline = fresh.timeline;
    }
  } catch { /* 忽略 */ }
  sessionCache.set(sourceAppId, entry);
  postSessionUpdate(sourceAppId);
  markInitialSessions();
});

smtc.on('session-removed', (sourceAppId: string) => {
  sessionCache.delete(sourceAppId);
  parentPort!.postMessage({ type: 'session-removed', sourceAppId });
});

smtc.on('session-media-changed', (sourceAppId: string, mediaProps: MediaProps) => {
  const existing = sessionCache.get(sourceAppId) ?? { media: null, playback: null, timeline: null };
  const updated: CacheEntry = { ...existing, media: mediaProps };

  /**
   * 刷新 playback / timeline，避免自动连播时缓存的播放状态过期（fix #41）
   * @docs https://github.com/JNTMTMTM/eIsland/issues/41
   */
  try {
    const fresh = smtc.getCachedSession(sourceAppId);
    if (fresh) {
      updated.playback = fresh.playback;
      updated.timeline = fresh.timeline;
    }
  } catch { /* 忽略 */ }
  sessionCache.set(sourceAppId, updated);
  postSessionUpdate(sourceAppId);
});

smtc.on('session-playback-changed', (sourceAppId: string, playbackInfo: PlaybackInfo) => {
  const existing = sessionCache.get(sourceAppId) ?? { media: null, playback: null, timeline: null };
  // Monitor 已合并同批次的时间线；暂停/恢复时不能把新状态配到旧位置。
  const fresh = smtc.getCachedSession(sourceAppId);
  const timeline = fresh ? fresh.timeline : existing.timeline;
  const updated = { ...existing, playback: playbackInfo };
  updated.timeline = timeline;
  sessionCache.set(sourceAppId, updated);
  postSessionUpdate(sourceAppId, false);
});

smtc.on('session-timeline-changed', (sourceAppId: string, timelineProps: TimelineProps) => {
  const existing = sessionCache.get(sourceAppId) ?? { media: null, playback: null, timeline: null };
  sessionCache.set(sourceAppId, { ...existing, timeline: timelineProps });
  postSessionUpdate(sourceAppId, false);
});

/** 接收主进程请求：主动查询当前所有 SMTC 会话（用于播放源检测按钮） */
parentPort.on('message', (msg: SmtcCommandRequest | { type: 'cancel-command'; requestId: number } | { type: 'detect-sources' }) => {
  if (msg.type === 'command') {
    if (msg.command === 'getTimestamp' && msg.deadline > Date.now()) {
      const cached = smtc.getCachedSession(msg.sourceAppId);
      const timeline = cached?.timeline;
      // 监控时钟记录了暂停与变速历史；新命令进程无法从一个旧 WinRT 采样还原这些区间。
      if (timeline && Number.isFinite(timeline.sampledAtMs)) {
        const status = cached?.playback?.playbackStatus;
        const playbackStatuses: Record<number, string> = { 0: 'closed', 1: 'opened', 2: 'changing', 3: 'stopped', 4: 'playing', 5: 'paused' };
        parentPort!.postMessage({
          type: 'command-result',
          requestId: msg.requestId,
          result: {
            isAvailable: true,
            playbackStatus: playbackStatuses[status ?? -1] ?? 'unknown',
            playbackRate: cached?.playback?.playbackRate,
            sourceAppUserModelId: msg.sourceAppId,
            timeline: {
              position: timeline.position,
              sampledAtMs: timeline.sampledAtMs,
              startTime: 0,
              endTime: timeline.duration,
              minSeekTime: 0,
              maxSeekTime: timeline.duration,
            },
          },
        });
        return;
      }
    }
    commands.execute(msg, (response) => parentPort!.postMessage(response));
    return;
  }
  if (msg.type === 'cancel-command') {
    commands.cancel(msg.requestId);
    return;
  }
  if (msg.type === 'detect-sources') {
    try {
      const sessions = smtc.getMediaSessions();
      parentPort!.postMessage({
        type: 'detect-sources-result',
        sources: sessions.map((s) => {
          const cached = sessionCache.get(s.sourceAppId);
          return {
            sourceAppId: s.sourceAppId,
            isPlaying: (s.playback?.playbackStatus ?? 0) === 4,
            hasTitle: Boolean(s.media?.title),
            thumbnail: cached?.media?.thumbnail ?? s.media?.thumbnail ?? null,
          };
        }),
      });
    } catch {
      parentPort!.postMessage({ type: 'detect-sources-result', sources: [] });
    }
  }
});

/** 初始化：启动监控 */
smtc.start();

/** 初始化：读取当前已存在的会话并推送快照 */
try {
  const initialSessions = smtc.getMediaSessions();
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

/** 进程退出时清理 */
process.on('exit', () => {
  commands.dispose();
  smtc.stop();
});
