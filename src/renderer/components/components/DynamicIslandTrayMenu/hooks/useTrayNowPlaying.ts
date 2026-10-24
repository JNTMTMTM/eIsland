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
 * @file useTrayNowPlaying.ts
 * @description 跟踪当前播放的媒体信息，并提供托盘音乐卡片的播放控制与进度跳转
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { estimatePlaybackPosition } from '../utils/trayPlayback';
import type { NowPlayingInfo } from '../../../../../preload/types/media';
import type { TrayNowPlaying } from '../types';

interface TrayNowPlayingControls {
  /** 当前播放信息，无媒体时为 null */
  nowPlaying: TrayNowPlaying | null;
  /** 首次播放信息尚未读取到，卡片显示骨架屏 */
  loading: boolean;
  /** 暂停或恢复播放 */
  togglePlayback: () => void;
  /** 上一首 */
  playPrevious: () => void;
  /** 下一首 */
  playNext: () => void;
  /** 跳转到指定进度（毫秒） */
  seekTo: (positionMs: number) => void;
}

/**
 * 读取非负有限数，主进程字段缺失或异常时使用兜底值
 * @param value - 原始值
 * @param fallback - 兜底值
 * @returns 非负有限数
 */
function nonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * 将主进程媒体信息转为卡片展示数据
 * @description 进度类广播不携带封面，同一首歌沿用上一次的封面，换歌后再等待新封面；缺少采样时刻时以收到时刻为准
 * @param info - 主进程下发的媒体信息
 * @param previous - 上一次的展示数据
 * @returns 展示数据，无标题时视为无媒体
 */
export function toTrayNowPlaying(info: NowPlayingInfo | null, previous: TrayNowPlaying | null): TrayNowPlaying | null {
  if (!info?.title) return null;
  const sameTrack = previous?.title === info.title && previous.artist === info.artist;
  const thumbnail = info.thumbnail === undefined ? (sameTrack ? previous.thumbnail : null) : info.thumbnail;
  return {
    title: info.title,
    artist: info.artist ?? '',
    isPlaying: Boolean(info.isPlaying),
    thumbnail: thumbnail || null,
    durationMs: nonNegative(info.duration_ms, 0),
    positionMs: nonNegative(info.position_ms, 0),
    positionTimestampMs: nonNegative(info.positionTimestampMs, Date.now()),
    playbackRate: nonNegative(info.playbackRate, 1),
  };
}

/**
 * 订阅媒体播放信息，每次打开菜单后主动刷新一次
 * @description 首次读取完成前处于加载态；之后的打开沿用已有信息静默刷新，避免每次都闪骨架屏
 * @param openCount - 菜单打开次数，变化时重新拉取完整信息（含封面）
 * @returns 播放信息与控制函数
 */
export function useTrayNowPlaying(openCount: number): TrayNowPlayingControls {
  const [nowPlaying, setNowPlaying] = useState<TrayNowPlaying | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => window.api.onNowPlayingInfo((info) => {
    setNowPlaying((previous) => toTrayNowPlaying(info, previous));
    setLoading(false);
  }), []);

  useEffect(() => {
    if (openCount === 0) return undefined;
    let cancelled = false;
    window.api.mediaCurrentInfoGet()
      // eslint-disable-next-line promise/prefer-await-to-then -- effect 不能是 async，需在此处理结果与失败。
      .then((info) => {
        if (!cancelled) setNowPlaying((previous) => toTrayNowPlaying(info, previous));
      })
      .catch(() => undefined)
      // eslint-disable-next-line promise/prefer-await-to-then -- 读取失败同样结束加载态，显示未在播放。
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openCount]);

  // 主进程按当前状态切换播放/暂停，这里先乐观更新图标，随后的媒体广播会校正真实状态。
  // 进度同时锚定到当前时刻，否则暂停后进度条会退回上次采样的位置。
  const togglePlayback = (): void => {
    if (!nowPlaying) return;
    const now = Date.now();
    setNowPlaying({
      ...nowPlaying,
      isPlaying: !nowPlaying.isPlaying,
      positionMs: estimatePlaybackPosition(nowPlaying, now),
      positionTimestampMs: now,
    });
    window.api.mediaPlayPause().catch(() => undefined);
  };
  const playPrevious = (): void => {
    if (nowPlaying) window.api.mediaPrev().catch(() => undefined);
  };
  const playNext = (): void => {
    if (nowPlaying) window.api.mediaNext().catch(() => undefined);
  };
  // 先把进度移到目标位置，松手后滑块不会跳回旧进度；随后的媒体广播会校正真实进度。
  const seekTo = (targetMs: number): void => {
    if (!nowPlaying) return;
    setNowPlaying({ ...nowPlaying, positionMs: targetMs, positionTimestampMs: Date.now() });
    window.api.mediaSeek(targetMs).catch(() => undefined);
  };

  return { nowPlaying, loading, togglePlayback, playPrevious, playNext, seekTo };
}
