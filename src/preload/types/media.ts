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
 * @file media.ts
 * @description 媒体与音乐播放相关类型定义
 * @author 鸡哥
 */

/** 正在播放的歌曲信息 */
export interface NowPlayingInfo {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  position_ms: number;
  isPlaying: boolean;
  thumbnail?: string | null;
  canFastForward: boolean;
  canSkip: boolean;
  canLike: boolean;
  canChangeVolume: boolean;
  canSetOutput: boolean;
}

/** SMTC 播放源信息 */
export interface SmtcSourceInfo {
  sourceAppId: string;
  isPlaying: boolean;
  hasTitle: boolean;
  thumbnail: string | null;
}

/** SMTC 播放源检测结果 */
export interface DetectSourceAppIdResult {
  ok: boolean;
  sources: SmtcSourceInfo[];
  message: string;
}

/** SMTC 时间线信息 */
export interface SmtcTimeline {
  startTime: number;
  endTime: number;
  position: number;
  minSeekTime: number;
  maxSeekTime: number;
}

/** SMTC 时间戳结果 */
export interface SmtcTimestampResult {
  isAvailable: boolean;
  playbackStatus: string;
  timeline: SmtcTimeline | null;
}

/** 播放源切换请求数据 */
export interface SourceSwitchRequestData {
  sourceAppId: string;
  title: string;
  artist: string;
}
