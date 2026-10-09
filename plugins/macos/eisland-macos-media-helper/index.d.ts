/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file index.d.ts
 * @description macOS 媒体插件的公共类型与 Windows 事件兼容接口。
 * @author 鸡哥
 */
import type { MediaStatus, TimestampInfo, SessionSnapshot, CommandResult } from './types';

export type { PlaybackStatus, TimelineProperties, PlaybackControls, MediaStatus, CommandResult, TimestampInfo, MediaProps, PlaybackInfo, TimelineProps, SessionSnapshot, ClientOptions, MediaEvents } from './types';
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
export { MediaClient } from './client';
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
export { MediaMonitor, MediaMonitor as SmtcMonitor } from './media-monitor';

/**
 * 读取当前媒体状态缓存。
 * @returns 默认客户端缓存状态。
 */
export function getStatus(): MediaStatus;
/**
 * 读取轻量播放时间戳。
 * @returns 默认客户端轻量时间戳。
 */
export function getTimestamp(): TimestampInfo;
/**
 * 读取当前可观测播放源。
 * @returns 当前播放源列表。
 */
export function getMediaSessions(): SessionSnapshot[];
/**
 * 主动查询并刷新媒体缓存。
 * @returns 主动刷新后的媒体状态。
 */
export function refresh(): Promise<MediaStatus>;
/**
 * 发送播放命令。
 * @returns 播放命令发送结果。
 */
export function play(): Promise<CommandResult>;
/**
 * 发送暂停命令。
 * @returns 暂停命令发送结果。
 */
export function pause(): Promise<CommandResult>;
/**
 * 发送下一首命令。
 * @returns 下一首命令发送结果。
 */
export function next(): Promise<CommandResult>;
/**
 * 发送上一首命令。
 * @returns 上一首命令发送结果。
 */
export function previous(): Promise<CommandResult>;
/**
 * 发送停止命令。
 * @returns 停止命令发送结果。
 */
export function stop(): Promise<CommandResult>;
/**
 * 定位到指定播放位置。
 * @param positionSeconds - 秒单位的目标位置。
 * @returns 命令发送结果。
 */
export function seek(positionSeconds: number): Promise<CommandResult>;
/**
 * 设置随机播放模式。
 * @param active - true 开启曲目随机，false 关闭。
 * @returns 命令发送结果。
 */
export function setShuffle(active: boolean): Promise<CommandResult>;
/**
 * 设置循环播放模式。
 * @param mode - 0 关闭，1 单曲，2 列表。
 * @returns 命令发送结果。
 */
export function setRepeatMode(mode: number): Promise<CommandResult>;
/**
 * 设置播放速率。
 * @param rate - 正整数速率。
 * @returns 命令发送结果。
 */
export function setPlaybackRate(rate: number): Promise<CommandResult>;
/** 关闭默认客户端及其后台进程。 */
export function shutdown(): void;
