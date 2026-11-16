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
 * @description 通过项目的 Rust 可执行文件读取 Windows 媒体会话
 * @author 鸡哥
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

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

/** 原生会话快照，仅声明 CLI 用到的字段 */
export interface NativeSession {
  sourceAppId: string;
  media: { title: string; artist: string; albumTitle: string } | null;
  playback: { playbackStatus: number } | null;
  timeline: { position: number; duration: number; sampledAtMs?: number } | null;
}

/** 读取当前会话，界面卸载时取消尚未结束的请求。 */
type ReadSessions = (root: string, signal: AbortSignal) => Promise<NativeSession[]>;

/** 读取句柄 */
export interface SmtcWatcher {
  /** 停止读取并取消当前查询 */
  stop: () => void;
}

/** 读取间隔 */
export const SMTC_INTERVAL_MS = 1000;

const PLAYBACK_STATUS: readonly SmtcStatus[] = ['closed', 'opened', 'changing', 'stopped', 'playing', 'paused'];

/**
 * 是否支持读取 SMTC
 * @param platform - 运行平台，默认 process.platform
 * @returns 仅 Windows 支持
 */
export function isSmtcSupported(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

const execute = promisify(execFile);

/**
 * 调用项目中已构建的 Rust 可执行文件读取会话。
 * @param root - 仓库根目录
 * @param signal - 停止查询的信号
 * @returns 当前所有 Windows 媒体会话
 */
async function readSessions(root: string, signal: AbortSignal): Promise<NativeSession[]> {
  const target = path.resolve(root, process.env.CARGO_TARGET_DIR || 'src-tauri/target');
  const override = process.env.EISLAND_SMTC_BINARY;
  const candidates = override
    ? [path.resolve(root, override)]
    : ['debug', 'release'].map((profile) => path.join(target, profile, 'eisland.exe'));
  const binary = candidates.find((file) => existsSync(file));
  if (!binary) throw new Error('eisland.exe not found. Run npm run build:e2e or set EISLAND_SMTC_BINARY.');
  const { stdout } = await execute(binary, ['--smtc-sessions'], {
    signal,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  const result: unknown = JSON.parse(stdout);
  if (!Array.isArray(result)) throw new Error('Invalid SMTC session snapshot.');
  return result as NativeSession[];
}

/**
 * 将原生快照转换为 CLI 会话
 * @param raw - 原生会话快照
 * @returns 会话
 */
export function toSmtcSession(raw: NativeSession): SmtcSession {
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
 * 每秒读取媒体会话。上一轮尚未完成时跳过本次查询。
 * @param root - 仓库根目录
 * @param onUpdate - 成功读取全部会话时回调
 * @param onError - 读取失败时回调
 * @param read - 原生会话读取函数，可在测试中替换
 * @returns 可停止的读取句柄
 */
export function watchSmtc(
  root: string,
  onUpdate: (sessions: SmtcSession[]) => void,
  onError: (message: string) => void,
  read: ReadSessions = readSessions,
): SmtcWatcher {
  const controller = new AbortController();
  let pending = false;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 定时回调处理读取错误，停止时取消子进程。
  const timer = setInterval(async () => {
    if (pending) return;
    pending = true;
    try {
      const sessions = await read(root, controller.signal);
      if (!controller.signal.aborted) onUpdate(sessions.map(toSmtcSession));
    } catch (error) {
      if (!controller.signal.aborted) onError(error instanceof Error ? error.message : String(error));
    } finally {
      pending = false;
    }
  }, SMTC_INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(timer);
      controller.abort();
    },
  };
}
