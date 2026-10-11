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
/** @file cliStateLoader.ts
 * @description 用短生命周期 Worker 加载/迁移 CLI 索引，避免主线程解析历史大 JSON。
 * @author 鸡哥
 */
import { Worker } from 'worker_threads';
import { join } from 'path';

/** 迁移出错时拒绝 Promise，让调用方保持原文件且停止覆盖持久化。 */
export function loadCliState(path: string, directory: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('CLI migration cancelled')); return; }
    const worker = new Worker(join(__dirname, 'codexWorker.js'), {
      workerData: { task: 'migrateClaude', path, directory },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    let done = false;
    const cleanup = (): void => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const fail = (reason: Error): void => {
      if (done) return;
      done = true; cleanup(); void worker.terminate(); reject(reason);
    };
    const abort = (): void => fail(new Error('CLI migration cancelled'));
    const timer = setTimeout(() => fail(new Error('CLI migration timed out')), 30000);
    signal?.addEventListener('abort', abort, { once: true });
    worker.once('message', (root: Record<string, unknown>) => { if (!done) { done = true; cleanup(); resolve(root); } });
    worker.once('error', fail);
    worker.once('exit', (code) => { if (!done) fail(new Error(`CLI migration exited: ${code}`)); });
  });
}
