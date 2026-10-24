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
 * @file trayPlayback.ts
 * @description 托盘音乐进度条的进度推算与时间格式化
 * @author 鸡哥
 */

import type { TrayNowPlaying } from '../types';

/**
 * 按采样进度与播放速率推算指定时刻的播放进度
 * @description 主进程只在播放状态或时间线变化时广播进度，菜单打开期间需在本地推进
 * @param nowPlaying - 当前播放信息
 * @param now - 推算时刻（Unix 毫秒），早于采样时刻时按采样进度处理
 * @returns 播放进度（毫秒），已知时长时不超过总时长
 */
export function estimatePlaybackPosition(nowPlaying: TrayNowPlaying, now: number): number {
  const elapsed = nowPlaying.isPlaying ? Math.max(0, now - nowPlaying.positionTimestampMs) * nowPlaying.playbackRate : 0;
  const position = nowPlaying.positionMs + elapsed;
  return nowPlaying.durationMs > 0 ? Math.min(nowPlaying.durationMs, position) : position;
}

/**
 * 将毫秒格式化为播放时间
 * @param ms - 时间（毫秒），负数按 0 处理
 * @returns 不足一小时为 m:ss，否则为 h:mm:ss
 */
export function formatPlaybackTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
