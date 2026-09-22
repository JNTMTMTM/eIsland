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
 * @file smtcActions.ts
 * @description 引导 SMTC — SMTC 订阅与数据处理
 * @author 鸡哥
 */

import type { NowPlayingInfo } from '../../../../../../preload/types/media';
import type { SmtcMediaMeta } from '../types';
import { extractDominantColor } from '../utils/smtcUtils';
import { runtime, dominantColorCache, notify } from './smtcStore';

let requestVersion = 0;

/** 构建 meta 快照 */
function buildMeta(
  info: NowPlayingInfo,
  coverImage: string | null,
  dominantColor: [number, number, number],
  sourceAppId: string,
): SmtcMediaMeta {
  return {
    title: info.title,
    artist: info.artist,
    album: info.album ?? '',
    coverImage,
    dominantColor,
    isPlaying: info.isPlaying,
    sourceAppId,
  };
}

/** 处理封面更新 */
async function resolveCover(thumbnail: string | null | undefined, hasThumbnail: boolean): Promise<[number, number, number]> {
  const newCover = hasThumbnail ? thumbnail ?? null : runtime.coverImage;
  runtime.coverImage = newCover;

  if (newCover) {
    const cached = dominantColorCache.get(newCover);
    if (cached) return cached;
    dominantColorCache.clear();
    const pending = extractDominantColor(newCover);
    dominantColorCache.set(newCover, pending);
    return pending;
  }
  dominantColorCache.clear();
  return [0, 0, 0];
}

/** 获取播放源（仅查询一次） */
async function resolveSourceAppId(): Promise<string> {
  if (runtime.sourceAppId) return runtime.sourceAppId;
  try {
    const result = await window.api.musicDetectSourceAppId();
    const sources = result?.sources ?? [];
    const active = sources.find((s) => s.isPlaying && s.hasTitle) ?? sources[0];
    if (active) return active.sourceAppId;
  } catch { /* ignore */ }
  return '';
}

/** 处理 SMTC 推送 */
export async function handleNowPlaying(info: NowPlayingInfo | null): Promise<void> {
  if (!runtime.initialized) return;
  const version = ++requestVersion;
  if (!info || !info.title) {
    runtime.status = 'no-media';
    runtime.meta = null;
    runtime.coverImage = null;
    runtime.dominantColor = [0, 0, 0];
    dominantColorCache.clear();
    notify();
    return;
  }

  const hasThumbnail = Object.prototype.hasOwnProperty.call(info, 'thumbnail');
  const color = await resolveCover(info.thumbnail, hasThumbnail);
  if (!runtime.initialized || requestVersion !== version) return;
  const sourceAppId = await resolveSourceAppId();
  if (!runtime.initialized || requestVersion !== version) return;
  runtime.dominantColor = color;
  runtime.sourceAppId = sourceAppId;

  runtime.meta = buildMeta(info, runtime.coverImage, runtime.dominantColor, runtime.sourceAppId);
  runtime.status = 'success';
  notify();
}

/** 初始化 SMTC 订阅（仅执行一次） */
export function ensureInitialized(): void {
  if (runtime.initialized) return;
  runtime.initialized = true;

  const version = ++requestVersion;
  window.api.mediaCurrentInfoGet().then((info) => {
    if (!runtime.initialized || requestVersion !== version) return;
    return handleNowPlaying(info);
  }).catch(() => {});
  runtime.unsubscribe = window.api.onNowPlayingInfo(handleNowPlaying);
}

/** 释放 SMTC 订阅与状态，允许下次 ensureInitialized 重新创建 */
export function dispose(): void {
  if (!runtime.initialized) return;
  requestVersion += 1;
  runtime.initialized = false;
  runtime.unsubscribe?.();
  runtime.unsubscribe = null;
  runtime.status = 'loading';
  runtime.meta = null;
  runtime.coverImage = null;
  runtime.dominantColor = [0, 0, 0];
  runtime.sourceAppId = '';
  dominantColorCache.clear();
}
