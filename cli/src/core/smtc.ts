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

import { execFile, spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { t } from './i18n';

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

/** 持续读取会话：每收到一份快照回调一次；读取进程意外结束时 reject，停止信号触发后 resolve。 */
type StreamSessions = (
  root: string,
  signal: AbortSignal,
  onSessions: (sessions: NativeSession[]) => void,
) => Promise<void>;

/** 读取句柄 */
export interface SmtcWatcher {
  /** 停止读取并取消当前查询 */
  stop: () => void;
}

/** 读取间隔，同时作为读取进程退出后的重启间隔 */
export const SMTC_INTERVAL_MS = 1000;

/** 持续输出会话快照的参数，旧版可执行文件不包含该参数 */
const WATCH_FLAG = '--smtc-sessions-watch';

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
 * 按 Cargo 的规则解析构建目录：相对的 CARGO_TARGET_DIR 基于 src-tauri，否则读取 cargo metadata。
 * @param root - 仓库根目录
 * @returns 构建目录绝对路径；Cargo 不可用时回退到 src-tauri/target
 */
async function cargoTargetDirectory(root: string): Promise<string> {
  const tauri = path.join(root, 'src-tauri');
  const configured = process.env.CARGO_TARGET_DIR;
  if (configured) return path.resolve(tauri, configured);
  try {
    const { stdout } = await execute(
      'cargo',
      ['metadata', '--no-deps', '--format-version', '1', '--offline', '--manifest-path', path.join(tauri, 'Cargo.toml')],
      { cwd: tauri, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    );
    const target: unknown = (JSON.parse(stdout) as { target_directory?: unknown }).target_directory;
    if (typeof target === 'string' && path.isAbsolute(target)) return target;
  } catch {
    // 未安装 Cargo 或离线解析失败时使用默认目录。
  }
  return path.join(tauri, 'target');
}

/**
 * 选择最新构建的可执行文件，并确认其支持持续读取参数。
 * @param root - 仓库根目录
 * @returns 可执行文件路径
 */
async function findBinary(root: string): Promise<string> {
  const override = process.env.EISLAND_SMTC_BINARY;
  const target = override ? '' : await cargoTargetDirectory(root);
  const candidates = override
    ? [path.resolve(root, override)]
    : ['debug', 'release'].map((profile) => path.join(target, profile, 'eisland.exe'));
  const builds = await Promise.all(candidates.map(async (file) => {
    try {
      return { file, modified: (await stat(file)).mtimeMs };
    } catch {
      return null;
    }
  }));
  const [newest] = builds
    .filter((build) => build !== null)
    .sort((left, right) => right.modified - left.modified);
  if (!newest) throw new Error(t('devCli.localTest.smtc.binaryMissing'));
  // 旧版本不认识该参数，会直接启动完整的桌面应用。
  if (!(await readFile(newest.file)).includes(WATCH_FLAG)) {
    throw new Error(t('devCli.localTest.smtc.binaryOutdated', { file: newest.file }));
  }
  return newest.file;
}

/**
 * 启动一个常驻的 Rust 读取进程，每秒解析一行会话快照。
 * @param root - 仓库根目录
 * @param signal - 停止读取并结束子进程的信号
 * @param onSessions - 收到一份快照时回调
 * @returns 停止后 resolve；进程意外退出或输出无效时 reject
 */
async function streamSessions(
  root: string,
  signal: AbortSignal,
  onSessions: (sessions: NativeSession[]) => void,
): Promise<void> {
  const binary = await findBinary(root);
  if (signal.aborted) return;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, [WATCH_FLAG], { signal, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000);
    });
    createInterface({ input: child.stdout }).on('line', (line) => {
      try {
        const result: unknown = JSON.parse(line);
        if (!Array.isArray(result)) throw new Error(t('devCli.localTest.smtc.invalidSnapshot'));
        onSessions(result as NativeSession[]);
      } catch (error) {
        child.kill();
        const invalid = error instanceof SyntaxError || !(error instanceof Error);
        reject(invalid ? new Error(t('devCli.localTest.smtc.invalidSnapshot')) : error);
      }
    });
    child.once('error', (error) => {
      if (signal.aborted) resolve();
      else reject(error);
    });
    child.once('close', (code) => {
      if (signal.aborted) resolve();
      else reject(new Error(stderr.trim() || t('devCli.localTest.smtc.exited', { code: String(code) })));
    });
  });
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
 * 通过常驻读取进程每秒接收媒体会话，进程退出后报告错误并按间隔重启。
 * @param root - 仓库根目录
 * @param onUpdate - 收到全部会话时回调
 * @param onError - 读取失败时回调
 * @param stream - 原生会话读取函数，可在测试中替换
 * @returns 可停止的读取句柄
 */
export function watchSmtc(
  root: string,
  onUpdate: (sessions: SmtcSession[]) => void,
  onError: (message: string) => void,
  stream: StreamSessions = streamSessions,
): SmtcWatcher {
  const controller = new AbortController();
  const { signal } = controller;
  let timer: NodeJS.Timeout | undefined;
  const schedule = (ms: number): void => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 回调内部处理全部读取错误，停止时由信号结束子进程。
    timer = setTimeout(async () => {
      try {
        await stream(root, signal, (sessions) => {
          if (!signal.aborted) onUpdate(sessions.map(toSmtcSession));
        });
      } catch (error) {
        if (!signal.aborted) onError(error instanceof Error ? error.message : String(error));
      }
      if (!signal.aborted) schedule(SMTC_INTERVAL_MS);
    }, ms);
  };
  schedule(0);

  return {
    stop: () => {
      clearTimeout(timer);
      controller.abort();
    },
  };
}
