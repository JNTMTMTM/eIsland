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
 * @file screenshotRunner.ts
 * @description 单任务截图进程：有界等待、二进制 stdout、取消和硬超时。
 * @author 鸡哥
 */
import { spawn, type ChildProcess } from 'node:child_process';

type ScreenshotOperation = 'primary' | 'all' | 'windows' | 'encode';
interface ScreenshotBitmap { data: Buffer; width: number; height: number }

/**
 * 创建一个执行槽和一个等待槽，无常驻进程；主屏与选区入口交错时按顺序执行。
 * @param entryPath - 打包后的子进程入口
 * @param timeoutMs - 包含排队时间的硬截止时间
 * @returns 截图执行与退出清理接口
 */
export function createScreenshotRunner(entryPath: string, timeoutMs = 8000) {
  let child: ChildProcess | null = null;
  let activeAbort: (() => void) | null = null;
  let disposed = false;
  const waiting: Array<{ start: () => void; abort: () => void }> = [];
  return {
    /**
     * 有界运行截图/窗口枚举，像素直到取得执行槽位才复制。
     * @param operation - 原生操作
     * @param signal - 取消信号
     * @param prepareBitmap - 获得槽位后读取位图，等待期间不持有额外像素副本
     * @returns 二进制响应或 null
     */
    run(operation: ScreenshotOperation, signal?: AbortSignal, prepareBitmap?: () => ScreenshotBitmap): Promise<Buffer | null> {
      if (disposed || (child && waiting.length >= 1) || signal?.aborted) return Promise.resolve(null);
      return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        let failed = false;
        let finished = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let current: ChildProcess | undefined;
        const finish = (code: number | null): void => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          if (current && child === current) { child = null; activeAbort = null; }
          resolve(!failed && code === 0 && bytes > 0 ? Buffer.concat(chunks, bytes) : null);
          chunks.length = 0;
          if (!child && !disposed) waiting.shift()?.start();
        };
        const abort = (): void => {
          failed = true;
          chunks.length = 0;
          if (current) current.kill('SIGKILL');
          else {
            const index = waiting.indexOf(entry);
            if (index >= 0) waiting.splice(index, 1);
            finish(null);
          }
        };
        const start = (): void => {
          if (finished) return;
          if (disposed || signal?.aborted) { abort(); return; }
          try {
            const bitmap = prepareBitmap?.();
            current = spawn(process.execPath, [entryPath, operation, String(bitmap?.width || 0), String(bitmap?.height || 0)], {
              windowsHide: true, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
              stdio: [bitmap ? 'pipe' : 'ignore', 'pipe', 'ignore'],
            });
            child = current;
            activeAbort = abort;
            current.stdout?.on('data', (chunk: Buffer) => {
              if (failed) return;
              bytes += chunk.length;
              if (bytes > (operation === 'windows' ? 1024 * 1024 : 64 * 1024 * 1024)) { abort(); return; }
              chunks.push(chunk);
            });
            current.once('error', () => { failed = true; finish(null); });
            current.once('close', finish);
            if (bitmap) { current.stdin?.on('error', abort); current.stdin?.end(bitmap.data); }
          } catch { failed = true; finish(null); }
        };
        const entry = { start, abort };
        timer = setTimeout(abort, timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        if (child) waiting.push(entry); else start();
      });
    },
    /** 退出时终止进行中的任务并取消等待请求。 */
    dispose(): void {
      disposed = true;
      waiting.splice(0).forEach((entry) => entry.abort());
      activeAbort?.();
    },
  };
}
