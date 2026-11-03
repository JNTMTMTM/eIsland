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
 * @file taskManager.ts
 * @description 交互界面中并发运行的脚本任务：捕获输出、结束进程树与状态订阅
 * @author 鸡哥
 */

import spawn from 'cross-spawn';

import { sanitizeLine, splitChunk } from './outputBuffer';

import type { ChildProcess } from 'node:child_process';

/** 任务状态 */
export type TaskStatus = 'running' | 'succeeded' | 'failed' | 'killed';

/** 对外暴露的只读任务快照 */
export interface Task {
  /** 自增编号 */
  id: number;
  /** 脚本名 */
  name: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 退出码，运行中为 null */
  code: number | null;
  /** 已清理的输出行，包含尚未换行的末尾片段 */
  lines: readonly string[];
}

/** 任务管理器 */
export interface TaskManager {
  /** 启动脚本并返回任务快照 */
  start: (name: string, passthrough: string[]) => Task;
  /** 结束任务的整个进程树 */
  kill: (id: number) => void;
  /** 移除已结束的任务 */
  remove: (id: number) => void;
  /** 结束全部运行中的任务，超时后强制结束仍未退出的进程树 */
  killAll: () => Promise<void>;
  /** 订阅任务变化，返回取消订阅函数 */
  subscribe: (listener: () => void) => () => void;
  /** 获取当前任务快照，变化前返回同一引用以供 useSyncExternalStore 比较 */
  getSnapshot: () => readonly Task[];
}

/** 子进程输出流 */
type OutputStream = 'stdout' | 'stderr';

/** 任务内部记录 */
interface TaskRecord {
  id: number;
  name: string;
  status: TaskStatus;
  code: number | null;
  lines: string[];
  /** 各输出流尚未换行的末尾片段，分开保存以免两路输出拼进同一行 */
  partials: Record<OutputStream, string>;
  child: ChildProcess;
  killRequested: boolean;
  closed: Promise<void>;
}

const DEFAULT_MAX_LINES = 5000;
// 输出密集时合并通知，避免每个数据块都触发一次整屏重绘。
const NOTIFY_INTERVAL_MS = 50;
const KILL_TIMEOUT_MS = 5000;
const SIGNAL_EXIT_CODE = 130;

/**
 * 结束子进程及其全部后代进程
 * @description npm 通过 shell 启动脚本，只结束 npm 会遗留 electron 等孙进程；
 * Windows 使用 taskkill /T，类 Unix 平台向独立进程组发送信号
 * @param child - npm 子进程
 */
function killProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    // taskkill 无法启动或执行失败时，至少结束 npm 本身。
    killer.once('error', () => child.kill());
    killer.once('exit', (code) => {
      if (code !== 0) child.kill();
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // 进程组已不存在时退回只结束 npm 本身。
    child.kill('SIGTERM');
  }
}

/**
 * 强制结束仍未退出的进程树
 * @description 正常结束超时后使用：类 Unix 平台向进程组发送 SIGKILL，Windows 上 taskkill /F 已是强制结束，
 * 只能再强制结束 npm 本身；最后断开管道并解除引用，保证即使有进程残留，CLI 自身也能退出
 * @param child - npm 子进程
 */
function forceKillProcessTree(child: ChildProcess): void {
  if (child.pid !== undefined && process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // 进程组已退出。
    }
  }
  child.kill('SIGKILL');
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

/**
 * 根据退出情况判定任务状态
 * @param killRequested - 是否由用户主动结束
 * @param code - 退出码
 * @returns 主动结束为 killed，否则按退出码区分成功与失败
 */
function exitStatus(killRequested: boolean, code: number): TaskStatus {
  if (killRequested) return 'killed';
  return code === 0 ? 'succeeded' : 'failed';
}

/**
 * 创建任务管理器
 * @param root - 仓库根目录，脚本在此执行
 * @param maxLines - 每个任务保留的最大输出行数，超出后丢弃最早的行，默认 5000
 * @returns 任务管理器
 */
export default function createTaskManager(root: string, maxLines: number = DEFAULT_MAX_LINES): TaskManager {
  const records: TaskRecord[] = [];
  const listeners = new Set<() => void>();
  let nextId = 1;
  let snapshot: readonly Task[] = [];
  let timer: NodeJS.Timeout | undefined;

  const toTask = (record: TaskRecord): Task => ({
    id: record.id,
    name: record.name,
    status: record.status,
    code: record.code,
    lines: [...record.lines, ...[record.partials.stdout, record.partials.stderr].filter(Boolean).map(sanitizeLine)],
  });

  const flush = (): void => {
    timer = undefined;
    snapshot = records.map(toTask);
    listeners.forEach((listener) => listener());
  };

  const schedule = (immediate = false): void => {
    if (immediate) {
      clearTimeout(timer);
      flush();
    } else {
      timer ??= setTimeout(flush, NOTIFY_INTERVAL_MS);
    }
  };

  const start = (name: string, passthrough: string[]): Task => {
    const args = ['run', name, ...(passthrough.length > 0 ? ['--', ...passthrough] : [])];
    // 输出改由面板渲染，子进程不再连接终端，需显式开启颜色；独立进程组便于类 Unix 平台整组结束。
    const child = spawn('npm', args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
      windowsHide: true,
      detached: process.platform !== 'win32',
    });
    const { promise: closed, resolve } = Promise.withResolvers<void>();
    const record: TaskRecord = {
      child, closed, name, id: nextId, status: 'running', code: null, lines: [], partials: { stdout: '', stderr: '' }, killRequested: false,
    };
    nextId += 1;
    records.push(record);

    const append = (stream: OutputStream, chunk: string): void => {
      const { complete, partial } = splitChunk(record.partials[stream], chunk);
      record.lines.push(...complete);
      if (record.lines.length > maxLines) record.lines.splice(0, record.lines.length - maxLines);
      record.partials[stream] = partial;
      schedule();
    };
    // error 与 close 可能先后触发，仅以首次结束为准。
    const finish = (code: number, status: TaskStatus): void => {
      if (record.status !== 'running') return;
      (['stdout', 'stderr'] as const).forEach((stream) => {
        if (record.partials[stream]) append(stream, '\n');
      });
      record.code = code;
      record.status = status;
      schedule(true);
      resolve();
    };

    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => append('stdout', chunk));
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => append('stderr', chunk));
    child.once('error', (error) => {
      append('stderr', `${error.message}\n`);
      finish(1, 'failed');
    });
    child.once('close', (code) => {
      const exitCode = code ?? SIGNAL_EXIT_CODE;
      finish(exitCode, exitStatus(record.killRequested, exitCode));
    });
    schedule(true);
    return toTask(record);
  };

  const kill = (id: number): void => {
    const record = records.find((item) => item.id === id);
    if (!record || record.status !== 'running' || record.killRequested) return;
    record.killRequested = true;
    killProcessTree(record.child);
  };

  const remove = (id: number): void => {
    const index = records.findIndex((item) => item.id === id && item.status !== 'running');
    if (index === -1) return;
    records.splice(index, 1);
    schedule(true);
  };

  const killAll = async (): Promise<void> => {
    const running = records.filter((record) => record.status === 'running');
    running.forEach((record) => kill(record.id));
    // taskkill 失败时进程可能永不退出，超时后放弃等待，避免 CLI 无法退出。
    const timeout = new Promise<void>((resolve) => {
      setTimeout(resolve, KILL_TIMEOUT_MS).unref();
    });
    await Promise.race([Promise.all(running.map((record) => record.closed)), timeout]);
    // 超时仍未退出的任务强制结束，否则残留的子进程会让 CLI 无法退出。
    running.filter((record) => record.status === 'running').forEach((record) => forceKillProcessTree(record.child));
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { start, kill, remove, killAll, subscribe, getSnapshot: () => snapshot };
}
