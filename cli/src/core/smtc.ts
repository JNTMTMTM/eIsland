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
 * @file smtc.ts
 * @description 本机 SMTC（系统媒体传输控件）全部播放实例读取
 * @description 直接加载仓库内的 eisland-windows-smtc-helper 插件，启动其会话监控后每秒同步读取全部会话
 * @author 鸡哥
 */

import { createRequire } from 'node:module';
import path from 'node:path';

/** 播放状态，按 WinRT GlobalSystemMediaTransportControlsSessionPlaybackStatus 枚举顺序 */
export type SmtcStatus = 'closed' | 'opened' | 'changing' | 'stopped' | 'playing' | 'paused' | 'unknown';

/** 单个媒体会话 */
export interface SmtcSession {
  /** 来源应用标识 */
  app: string;
  /** 标题 */
  title: string;
  /** 艺术家 */
  artist: string;
  /** 专辑 */
  album: string;
  /** 播放状态 */
  status: SmtcStatus;
  /** 时间线位置（秒），对应 updated 时刻 */
  position: number;
  /** 总时长（秒），应用未提供时间线时为 0 */
  duration: number;
  /** 位置采样时刻（Unix 毫秒），未提供时为 0 */
  updated: number;
}

/** 插件返回的会话快照，仅声明 CLI 用到的字段 */
export interface HelperSession {
  sourceAppId: string;
  media: { title: string; artist: string; albumTitle: string } | null;
  playback: { playbackStatus: number } | null;
  timeline: { position: number; duration: number; sampledAtMs?: number } | null;
}

/** 插件的会话监控器 */
export interface HelperMonitor {
  start: () => void;
  stop: () => void;
  getMediaSessions: () => HelperSession[];
  on: (event: 'error', listener: (error: Error) => void) => unknown;
}

/** 插件模块入口 */
export interface HelperModule {
  SmtcMonitor: new () => HelperMonitor;
}

/** 读取句柄 */
export interface SmtcWatcher {
  /** 停止读取并关闭插件监控 */
  stop: () => void;
}

/** 插件在仓库中的位置 */
export const SMTC_HELPER_DIR = path.join('plugins', 'windows', 'eisland-windows-smtc-helper');
/** 读取间隔 */
export const SMTC_INTERVAL_MS = 1000;

const PLAYBACK_STATUS: readonly SmtcStatus[] = ['closed', 'opened', 'changing', 'stopped', 'playing', 'paused'];

/**
 * 是否支持读取 SMTC
 * @param platform - 运行平台
 * @returns 仅 Windows 支持
 */
export function isSmtcSupported(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

/**
 * 加载仓库内的 SMTC 插件
 * @description 插件为 CommonJS 并通过 koffi 加载原生 DLL，需在运行时按仓库路径加载，不能打包进 CLI
 * @param root - 仓库根目录
 * @returns 插件模块
 */
export function loadSmtcHelper(root: string): HelperModule {
  return createRequire(import.meta.url)(path.join(root, SMTC_HELPER_DIR)) as HelperModule;
}

/**
 * 将插件快照转换为 CLI 会话
 * @param raw - 插件返回的会话快照
 * @returns 会话
 */
export function toSmtcSession(raw: HelperSession): SmtcSession {
  return {
    app: raw.sourceAppId,
    title: raw.media?.title ?? '',
    artist: raw.media?.artist ?? '',
    album: raw.media?.albumTitle ?? '',
    status: PLAYBACK_STATUS[raw.playback?.playbackStatus ?? -1] ?? 'unknown',
    position: raw.timeline?.position ?? 0,
    duration: raw.timeline?.duration ?? 0,
    updated: raw.timeline?.sampledAtMs ?? 0,
  };
}

/**
 * 启动插件监控并定时读取全部会话
 * @description 插件监控启动后会话列表需要短暂时间填充，因此首次读取放在第一个间隔之后
 * @param root - 仓库根目录
 * @param onUpdate - 每次读取到全部会话时回调
 * @param onError - 插件加载、启动或读取失败时回调
 * @param load - 插件加载函数，测试时可替换
 * @returns 读取句柄
 */
export function watchSmtc(
  root: string,
  onUpdate: (sessions: SmtcSession[]) => void,
  onError: (message: string) => void,
  load: (root: string) => HelperModule = loadSmtcHelper,
): SmtcWatcher {
  const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
  let monitor: HelperMonitor;
  try {
    const { SmtcMonitor } = load(root);
    monitor = new SmtcMonitor();
    monitor.on('error', (error) => onError(error.message));
    monitor.start();
  } catch (error) {
    onError(message(error));
    return { stop: () => {} };
  }

  const timer = setInterval(() => {
    try {
      onUpdate(monitor.getMediaSessions().map(toSmtcSession));
    } catch (error) {
      onError(message(error));
    }
  }, SMTC_INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(timer);
      monitor.stop();
    },
  };
}
