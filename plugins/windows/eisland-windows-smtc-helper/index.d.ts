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

import { EventEmitter } from 'events';

// ── 数据类型 ──────────────────────────────────────────────────

export interface TimelineProperties {
  /** Start time of the media in seconds */
  startTime: number;
  /** End time of the media in seconds */
  endTime: number;
  /** Current playback position in seconds */
  position: number;
  /** Minimum seekable time in seconds */
  minSeekTime: number;
  /** Maximum seekable time in seconds */
  maxSeekTime: number;
}

export interface PlaybackControls {
  isPlayEnabled: boolean;
  isPauseEnabled: boolean;
  isNextEnabled: boolean;
  isPreviousEnabled: boolean;
  isStopEnabled: boolean;
  isRecordEnabled: boolean;
  isFastForwardEnabled: boolean;
  isRewindEnabled: boolean;
  isChannelUpEnabled: boolean;
  isChannelDownEnabled: boolean;
}

export interface MediaStatus {
  isAvailable: boolean;
  title: string | null;
  artist: string | null;
  albumTitle: string | null;
  albumArtist: string | null;
  trackNumber: number | null;
  genres: string[] | null;
  playbackStatus: 'playing' | 'paused' | 'stopped' | 'closed' | 'opened' | 'changing' | 'unknown';
  isShuffleActive: boolean | null;
  repeatMode: number | null;
  /** Playback rate (1.0 = normal speed) */
  playbackRate: number | null;
  /** App User Model ID of the media source */
  sourceAppUserModelId: string | null;
  /** Album art as a data URI (data:image/jpeg;base64,...) */
  thumbnail: string | null;
  timeline: TimelineProperties | null;
  controls: PlaybackControls | null;
}

export interface CommandResult {
  success: boolean;
  error: string | null;
}

/**
 * 轻量级时间戳信息（不含媒体元数据）
 * 用于歌词校准等仅需播放位置的场景
 */
export interface TimestampInfo {
  isAvailable: boolean;
  playbackStatus: 'playing' | 'paused' | 'stopped' | 'closed' | 'opened' | 'changing' | 'unknown';
  timeline: TimelineProperties | null;
}

// ── 监控器类型 ────────────────────────────────────────────────

export interface MediaProps {
  title: string;
  artist: string;
  albumTitle: string;
  albumArtist: string;
  genres: string[];
  albumTrackCount: number;
  trackNumber: number;
  thumbnail: string | null;
}

export interface PlaybackInfo {
  playbackStatus: number;
  playbackType: number;
}

export interface TimelineProps {
  position: number;
  duration: number;
}

export interface SessionSnapshot {
  sourceAppId: string;
  media: MediaProps | null;
  playback: PlaybackInfo | null;
  timeline: TimelineProps | null;
}

// ── 命令函数 ──────────────────────────────────────────────────

/** 发送播放命令 */
export function play(): CommandResult;
/** 发送暂停命令 */
export function pause(): CommandResult;
/** 跳到下一首 */
export function next(): CommandResult;
/** 跳到上一首 */
export function previous(): CommandResult;
/** 获取当前媒体状态 */
export function getStatus(): MediaStatus;

/** 轻量级获取当前播放时间戳（不含媒体元数据），用于歌词校准 */
export function getTimestamp(): TimestampInfo;

/** Seek 到指定位置（秒） */
export function seek(positionSeconds: number): CommandResult;
/** 停止播放 */
export function stop(): CommandResult;
/** 设置随机播放 (true=开启, false=关闭) */
export function setShuffle(active: boolean): CommandResult;
/** 设置循环模式 (0=None, 1=Track, 2=List) */
export function setRepeatMode(mode: number): CommandResult;
/** 设置播放速率 (1.0=正常速度) */
export function setPlaybackRate(rate: number): CommandResult;

// ── 监控器类 ──────────────────────────────────────────────────

/**
 * SMTC 会话实时监控器
 * 替代 @coooookies/windows-smtc-monitor，通过 DLL FFI 监听 WinRT 事件
 *
 * @example
 * ```js
 * const monitor = new SmtcMonitor();
 * monitor.on('session-added', (sourceAppId, mediaProps) => { ... });
 * monitor.on('session-removed', (sourceAppId) => { ... });
 * monitor.on('session-media-changed', (sourceAppId, mediaProps) => { ... });
 * monitor.on('session-playback-changed', (sourceAppId, playbackInfo) => { ... });
 * monitor.on('session-timeline-changed', (sourceAppId, timelineProps) => { ... });
 * monitor.start();
 * // ...
 * monitor.stop();
 * ```
 */
export class SmtcMonitor extends EventEmitter {
  constructor();
  /** 启动监控 */
  start(): void;
  /** 停止监控 */
  stop(): void;
  /** 获取当前所有会话快照 */
  getMediaSessions(): SessionSnapshot[];

  on(event: 'session-added', listener: (sourceAppId: string, mediaProps: MediaProps) => void): this;
  on(event: 'session-removed', listener: (sourceAppId: string) => void): this;
  on(event: 'session-media-changed', listener: (sourceAppId: string, mediaProps: MediaProps) => void): this;
  on(event: 'session-playback-changed', listener: (sourceAppId: string, playbackInfo: PlaybackInfo) => void): this;
  on(event: 'session-timeline-changed', listener: (sourceAppId: string, timelineProps: TimelineProps) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  emit(event: 'session-added', sourceAppId: string, mediaProps: MediaProps): boolean;
  emit(event: 'session-removed', sourceAppId: string): boolean;
  emit(event: 'session-media-changed', sourceAppId: string, mediaProps: MediaProps): boolean;
  emit(event: 'session-playback-changed', sourceAppId: string, playbackInfo: PlaybackInfo): boolean;
  emit(event: 'session-timeline-changed', sourceAppId: string, timelineProps: TimelineProps): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string, ...args: any[]): boolean;
}
