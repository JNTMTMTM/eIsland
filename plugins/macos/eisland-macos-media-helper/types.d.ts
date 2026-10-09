/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file types.d.ts
 * @description 媒体状态、配置与监控事件的公共数据类型。
 * @author 鸡哥
 */
/** macOS 缺少部分 Windows 状态，无法确定的状态返回 unknown。 */
export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'closed' | 'opened' | 'changing' | 'unknown';

/** 时间线的所有值均为秒，未提供时长时 endTime 为 0。 */
export interface TimelineProperties {
  startTime: number;
  endTime: number;
  position: number;
  minSeekTime: number;
  maxSeekTime: number;
}

/** 为 Windows 状态结构保留的控制能力类型；此后端目前返回 null。 */
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

/** 当前播放源的缓存快照；元数据缺失时对应字段为 null。 */
export interface MediaStatus {
  isAvailable: boolean;
  title: string | null;
  artist: string | null;
  albumTitle: string | null;
  albumArtist: string | null;
  trackNumber: number | null;
  genres: string[] | null;
  playbackStatus: PlaybackStatus;
  isShuffleActive: boolean | null;
  repeatMode: number | null;
  playbackRate: number | null;
  /** 兼容字段名，macOS 值为 Bundle ID，不是 Windows AUMID。 */
  sourceAppUserModelId: string | null;
  thumbnail: string | null;
  timeline: TimelineProperties | null;
  controls: PlaybackControls | null;
}

/** success 仅表示桥接成功发送命令，不保证播放器已经执行。 */
export interface CommandResult {
  success: boolean;
  error: string | null;
}

/** 轻量时间戳不包含封面，播放位置由最近快照与单调时钟推算。 */
export interface TimestampInfo {
  isAvailable: boolean;
  playbackStatus: PlaybackStatus;
  timeline: TimelineProperties | null;
}

/** 与 Windows 会话事件结构兼容的媒体元数据。 */
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

/** 播放状态兼容 Windows 数值：4 播放，5 暂停；媒体类型未知时为 0。 */
export interface PlaybackInfo {
  playbackStatus: number;
  playbackType: number;
}

/** 秒单位的位置与时长。 */
export interface TimelineProps {
  position: number;
  duration: number;
}

/** 当前可观测源，移除只表示不再是当前源，不意味着播放器已退出。 */
export interface SessionSnapshot {
  sourceAppId: string;
  media: MediaProps | null;
  playback: PlaybackInfo | null;
  timeline: TimelineProps | null;
}

/** 可指定已解包的桥接资源位置；不会更改原生 .node 的加载路径。 */
export interface ClientOptions {
  resourceDirectory?: string;
  /** 单次请求超时，默认 4000，范围 100–30000 毫秒。 */
  timeoutMs?: number;
}

/** 带明确参数类型的兼容监控事件。 */
export interface MediaEvents {
  'session-added': (sourceAppId: string, media: MediaProps | null) => void;
  'session-removed': (sourceAppId: string) => void;
  'session-media-changed': (sourceAppId: string, media: MediaProps | null) => void;
  'session-playback-changed': (sourceAppId: string, playback: PlaybackInfo | null) => void;
  'session-timeline-changed': (sourceAppId: string, timeline: TimelineProps | null) => void;
  error: (error: Error) => void;
}
