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
 * @file downloadEngine.ts
 * @description 多线程下载引擎核心实现。
 * @author 鸡哥
 */

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, open, rename, rm, stat, unlink } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';
import { EMIT_INTERVAL_MS } from './downloadEngine/config';
import {
  buildChunks,
  inferFileNameFromUrl,
  isAbortError,
  mergePartFiles,
  normalizeThreads,
  parseContentDispositionFileName,
  safeFileName,
  type ChunkInfo,
} from './downloadEngine/utils';
import type { DownloadTaskSnapshot } from '../types/core/DownloadTaskSnapshot';
import type { StartDownloadOptions } from '../types/core/StartDownloadOptions';

export type { DownloadTaskStatus, DownloadTaskSnapshot } from '../types/core/DownloadTaskSnapshot';
export type { StartDownloadOptions } from '../types/core/StartDownloadOptions';

interface DownloadEngineOptions {
  onTaskUpdated?: (task: DownloadTaskSnapshot) => void;
}

interface DownloadProbeResult {
  fileName: string;
  totalBytes: number;
  supportsRange: boolean;
}

interface InternalTask extends DownloadTaskSnapshot {
  tempDir: string;
  tempOutputPath: string;
  partPaths: string[];
  supportsRange: boolean;
  abortControllers: Set<AbortController>;
  lastSampleTime: number;
  lastSampleBytes: number;
  lastEmitTime: number;
  run?: Promise<void>;
  controller: AbortController;
}

function toTaskSnapshot(task: InternalTask): DownloadTaskSnapshot {
  return {
    id: task.id,
    url: task.url,
    savePath: task.savePath,
    fileName: task.fileName,
    totalBytes: task.totalBytes,
    downloadedBytes: task.downloadedBytes,
    progress: task.progress,
    speedBytesPerSecond: task.speedBytesPerSecond,
    estimatedFinishAt: task.estimatedFinishAt,
    threads: task.threads,
    status: task.status,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export class MultiThreadDownloadEngine {
  private readonly tasks = new Map<string, InternalTask>();
  private readonly history = new Map<string, DownloadTaskSnapshot>();
  private activeConnections = 0;
  private readonly connectionWaiters: Array<() => void> = [];

  private readonly onTaskUpdated?: (task: DownloadTaskSnapshot) => void;

  constructor(options?: DownloadEngineOptions) {
    this.onTaskUpdated = options?.onTaskUpdated;
  }

  listTasks(): DownloadTaskSnapshot[] {
    return [...this.history.values(), ...Array.from(this.tasks.values(), toTaskSnapshot)];
  }

  getTask(taskId: string): DownloadTaskSnapshot | null {
    const task = this.tasks.get(taskId);
    return task ? toTaskSnapshot(task) : this.history.get(taskId) ?? null;
  }

  async startDownload(options: StartDownloadOptions): Promise<DownloadTaskSnapshot> {
    const normalizedUrl = String(options.url || '').trim();
    if (!normalizedUrl) {
      throw new Error('下载地址不能为空');
    }
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('仅支持 HTTP/HTTPS 下载地址');
    }

    const probe = await this.probeRemoteFile(parsedUrl);
    const threads = normalizeThreads(options.threads);
    const savePath = options.savePath && options.savePath.trim()
      ? options.savePath.trim()
      : join(options.defaultDir, probe.fileName);

    await mkdir(dirname(savePath), { recursive: true });

    const taskId = randomUUID();
    const tempDir = join(dirname(savePath), `.eisland-download-${taskId}`);
    const tempOutputPath = join(tempDir, `target${extname(savePath) || '.tmp'}`);
    await mkdir(tempDir, { recursive: true });

    const now = Date.now();
    const task: InternalTask = {
      id: taskId,
      url: parsedUrl.toString(),
      savePath,
      fileName: basename(savePath),
      totalBytes: probe.totalBytes,
      downloadedBytes: 0,
      progress: 0,
      speedBytesPerSecond: 0,
      estimatedFinishAt: null,
      threads,
      status: 'downloading',
      createdAt: now,
      updatedAt: now,
      tempDir,
      tempOutputPath,
      partPaths: [],
      supportsRange: probe.supportsRange,
      abortControllers: new Set<AbortController>(),
      lastSampleTime: now,
      lastSampleBytes: 0,
      lastEmitTime: 0,
      controller: new AbortController(),
    };

    this.tasks.set(task.id, task);
    this.emitTask(task, true);

    this.runTask(task, probe);

    return toTaskSnapshot(task);
  }

  cancelDownload(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status !== 'downloading') return false;

    task.status = 'canceled';
    task.controller.abort();
    task.updatedAt = Date.now();
    task.abortControllers.forEach((controller) => controller.abort());
    task.abortControllers.clear();
    this.emitTask(task, true);
    return true;
  }

  pauseDownload(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status !== 'downloading') return false;

    task.status = 'paused';
    task.controller.abort();
    task.speedBytesPerSecond = 0;
    task.estimatedFinishAt = null;
    task.updatedAt = Date.now();
    task.abortControllers.forEach((controller) => controller.abort());
    task.abortControllers.clear();
    this.emitTask(task, true);
    return true;
  }

  async resumeDownload(taskId: string): Promise<DownloadTaskSnapshot> {
    const task = this.tasks.get(taskId);
    if (!task) {
      if (this.history.has(taskId)) throw new Error('仅可继续已暂停的任务');
      throw new Error('下载任务不存在');
    }
    if (task.status !== 'paused') {
      throw new Error('仅可继续已暂停的任务');
    }
    // 上一轮的流和文件句柄退出后再复用临时文件。
    await task.run;
    if (!this.tasks.has(taskId) || task.status !== 'paused') throw new Error('仅可继续已暂停的任务');

    const now = Date.now();
    const probe = await this.probeRemoteFile(new URL(task.url));

    const canResume =
      probe.supportsRange &&
      probe.totalBytes > 0 &&
      probe.totalBytes === task.totalBytes;

    if (!canResume) {
      await this.cleanupTaskFiles(task);
      await mkdir(task.tempDir, { recursive: true });
      task.downloadedBytes = 0;
      task.progress = 0;
      task.partPaths = [];
    }

    task.status = 'downloading';
    task.controller = new AbortController();
    task.errorMessage = undefined;
    task.totalBytes = probe.totalBytes;
    task.supportsRange = probe.supportsRange;
    task.speedBytesPerSecond = 0;
    task.estimatedFinishAt = null;
    task.abortControllers.clear();
    task.lastSampleTime = now;
    task.lastSampleBytes = task.downloadedBytes;
    task.lastEmitTime = 0;
    task.updatedAt = now;

    this.emitTask(task, true);
    this.runTask(task, probe);

    return toTaskSnapshot(task);
  }

  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return this.history.delete(taskId);
    if (task.status === 'downloading') return false;
    this.tasks.delete(taskId);
    task.controller.abort();
    void task.run?.finally(() => this.cleanupTaskFiles(task));
    return true;
  }

  /**
   * 同一引擎的连接共享预算，排队请求也可随任务取消。
   * @param signal - 所属任务的取消信号。
   * @returns 释放连接槽位的函数。
   */
  private async acquireConnection(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (this.activeConnections >= 8) {
      await new Promise<void>((resolve, reject) => {
        const ready = (): void => { signal.removeEventListener('abort', abort); resolve(); };
        const abort = (): void => {
          const index = this.connectionWaiters.indexOf(ready);
          if (index >= 0) this.connectionWaiters.splice(index, 1);
          reject(signal.reason);
        };
        this.connectionWaiters.push(ready);
        signal.addEventListener('abort', abort, { once: true });
      });
    } else this.activeConnections += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.connectionWaiters.shift();
      if (next) next(); else this.activeConnections -= 1;
    };
  }

  /**
   * 统一结束与资源释放；历史只保存有界轻量快照。
   * @param task - 运行中的任务。
   * @param probe - 服务端下载能力。
   */
  private runTask(task: InternalTask, probe: DownloadProbeResult): void {
    task.run = this.executeDownload(task, probe).catch((error) => this.handleTaskFailure(task, error)).finally(() => {
      if (task.status === 'paused' || this.tasks.get(task.id) !== task) return;
      this.tasks.delete(task.id);
      this.history.set(task.id, toTaskSnapshot(task));
      while (this.history.size > 200) this.history.delete(this.history.keys().next().value!);
    });
  }

  private async probeRemoteFile(url: URL): Promise<DownloadProbeResult> {
    let fileName = inferFileNameFromUrl(url);
    let totalBytes = 0;
    let supportsRange = false;

    const signal = AbortSignal.timeout(15_000);
    const release = await this.acquireConnection(signal);
    try {
      signal.throwIfAborted();
      const headResponse = await fetch(url.toString(), { method: 'HEAD', signal });
      if (headResponse.ok) {
        const contentLength = headResponse.headers.get('content-length');
        totalBytes = Number(contentLength || 0) || 0;
        const acceptRanges = (headResponse.headers.get('accept-ranges') || '').toLowerCase();
        supportsRange = acceptRanges.includes('bytes');
        const disposition = headResponse.headers.get('content-disposition') || '';
        const dispositionName = parseContentDispositionFileName(disposition);
        if (dispositionName) {
          fileName = dispositionName;
        }
      }
    } catch {
      // ignore head errors
    } finally {
      release();
    }

    return {
      fileName: safeFileName(fileName),
      totalBytes,
      supportsRange,
    };
  }

  private async executeDownload(task: InternalTask, probe: DownloadProbeResult): Promise<void> {
    const useMultiThread = probe.supportsRange && probe.totalBytes > 0 && task.threads > 1;

    if (useMultiThread) {
      const chunks = buildChunks(probe.totalBytes, task.threads, task.tempDir);
      task.partPaths = chunks.map((chunk) => chunk.partPath);

      // Sync downloadedBytes with actual chunk file sizes on disk
      const chunkSizes = await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const fileStat = await stat(chunk.partPath);
            return fileStat.size;
          } catch {
            return 0;
          }
        }),
      );
      const existingBytes = chunkSizes.reduce((sum, size) => sum + size, 0);
      task.downloadedBytes = Math.min(existingBytes, probe.totalBytes);
      if (existingBytes > 0) {
        this.updateTaskProgress(task);
      }

      const pending = chunks.map((chunk) => this.downloadChunk(task, chunk));
      try {
        await Promise.all(pending);
      } catch (error) {
        // 第一处失败立即停掉其他分片，所有句柄关闭后才允许清理文件。
        task.controller.abort();
        task.abortControllers.forEach((controller) => controller.abort());
        await Promise.allSettled(pending);
        throw error;
      }
      if (task.status === 'canceled') {
        await this.cleanupTaskFiles(task);
        return;
      }
      await mergePartFiles(task.partPaths, task.tempOutputPath);
    } else {
      // Sync downloadedBytes with actual temp file size on disk
      if (probe.supportsRange && probe.totalBytes > 0) {
        try {
          const fileStat = await stat(task.tempOutputPath);
          if (fileStat.size > 0 && fileStat.size < probe.totalBytes) {
            task.downloadedBytes = fileStat.size;
            this.updateTaskProgress(task);
          } else {
            task.downloadedBytes = 0;
          }
        } catch {
          task.downloadedBytes = 0;
        }
      } else {
        task.downloadedBytes = 0;
      }

      await this.downloadSingle(task);
      if (task.status === 'canceled') {
        await this.cleanupTaskFiles(task);
        return;
      }
    }

    task.controller.signal.throwIfAborted();

    if (existsSync(task.savePath)) {
      await unlink(task.savePath).catch(() => {});
    }
    await rename(task.tempOutputPath, task.savePath);

    if (task.totalBytes <= 0) {
      task.totalBytes = task.downloadedBytes;
    }
    task.downloadedBytes = Math.max(task.downloadedBytes, task.totalBytes);
    task.progress = 1;
    task.speedBytesPerSecond = 0;
    task.estimatedFinishAt = null;
    task.status = 'completed';
    task.updatedAt = Date.now();
    this.emitTask(task, true);

    await this.cleanupTaskFiles(task, { keepOutput: true });
  }

  private async downloadSingle(task: InternalTask): Promise<void> {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, task.controller.signal]);
    const release = await this.acquireConnection(signal);
    task.abortControllers.add(controller);
    try {
      signal.throwIfAborted();
      let existingSize = 0;
      if (task.supportsRange && task.totalBytes > 0) {
        try {
          const fileStat = await stat(task.tempOutputPath);
          if (fileStat.size > 0 && fileStat.size < task.totalBytes) {
            existingSize = fileStat.size;
          }
        } catch {
          // file doesn't exist
        }
      }

      const headers: Record<string, string> = {};
      if (existingSize > 0) {
        headers['Range'] = `bytes=${existingSize}-`;
      }

      signal.throwIfAborted();
      const response = await fetch(task.url, { signal, headers });
      if (existingSize > 0 && response.status !== 206) {
        // Server doesn't support range for this request, restart
        existingSize = 0;
        task.downloadedBytes = 0;
      }
      if (!existingSize && !response.ok) {
        throw new Error(`下载请求失败: HTTP ${response.status}`);
      }
      if (!response.body) {
        throw new Error(`下载请求失败: HTTP ${response.status}`);
      }
      const contentLength = Number(response.headers.get('content-length') || 0) || 0;
      if (task.totalBytes <= 0 && contentLength > 0) {
        task.totalBytes = existingSize + contentLength;
      }

      const fileHandle = await open(task.tempOutputPath, existingSize > 0 ? 'a' : 'w');
      const reader = response.body.getReader();
      try {
        while (true) {
          signal.throwIfAborted();
          const result = await reader.read();
          if (result.done) break;
          const chunk = result.value;
          if (chunk && chunk.byteLength > 0) {
            await fileHandle.write(chunk);
            task.downloadedBytes += chunk.byteLength;
            this.updateTaskProgress(task);
          }
        }
      } finally {
        await Promise.resolve(reader.cancel()).catch(() => {});
        reader.releaseLock();
        await fileHandle.close();
      }
    } finally {
      task.abortControllers.delete(controller);
      release();
    }
  }

  private async downloadChunk(task: InternalTask, chunk: ChunkInfo): Promise<void> {
    const chunkExpectedSize = chunk.end - chunk.start + 1;

    // Check existing partial data
    let existingSize = 0;
    try {
      const fileStat = await stat(chunk.partPath);
      existingSize = fileStat.size;
    } catch {
      // file doesn't exist
    }

    // Chunk already fully downloaded
    if (existingSize >= chunkExpectedSize) {
      return;
    }

    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, task.controller.signal]);
    const release = await this.acquireConnection(signal);
    task.abortControllers.add(controller);
    try {
      signal.throwIfAborted();
      const rangeStart = chunk.start + existingSize;
      const response = await fetch(task.url, {
        signal,
        headers: {
          Range: `bytes=${rangeStart}-${chunk.end}`,
        },
      });
      if ((response.status !== 206 && response.status !== 200) || !response.body) {
        throw new Error(`分片下载失败: HTTP ${response.status}`);
      }

      const fileHandle = await open(chunk.partPath, existingSize > 0 ? 'a' : 'w');
      const reader = response.body.getReader();
      try {
        while (true) {
          signal.throwIfAborted();
          const result = await reader.read();
          if (result.done) break;
          const bytes = result.value;
          if (bytes && bytes.byteLength > 0) {
            await fileHandle.write(bytes);
            task.downloadedBytes += bytes.byteLength;
            this.updateTaskProgress(task);
          }
        }
      } finally {
        await Promise.resolve(reader.cancel()).catch(() => {});
        reader.releaseLock();
        await fileHandle.close();
      }
    } finally {
      task.abortControllers.delete(controller);
      release();
    }
  }

  private updateTaskProgress(task: InternalTask): void {
    const now = Date.now();
    const elapsedMs = Math.max(1, now - task.lastSampleTime);
    const deltaBytes = task.downloadedBytes - task.lastSampleBytes;

    task.speedBytesPerSecond = Math.max(0, Math.round((deltaBytes / elapsedMs) * 1000));
    task.lastSampleBytes = task.downloadedBytes;
    task.lastSampleTime = now;
    task.updatedAt = now;

    if (task.totalBytes > 0 && task.speedBytesPerSecond > 0 && task.downloadedBytes < task.totalBytes) {
      const remainBytes = task.totalBytes - task.downloadedBytes;
      const remainSeconds = remainBytes / task.speedBytesPerSecond;
      task.estimatedFinishAt = now + Math.max(0, Math.round(remainSeconds * 1000));
    } else {
      task.estimatedFinishAt = null;
    }

    if (task.totalBytes > 0) {
      task.progress = Math.max(0, Math.min(1, task.downloadedBytes / task.totalBytes));
    }

    this.emitTask(task, false);
  }

  private emitTask(task: InternalTask, force: boolean): void {
    const now = Date.now();
    if (!force && now - task.lastEmitTime < EMIT_INTERVAL_MS) return;
    task.lastEmitTime = now;
    this.onTaskUpdated?.(toTaskSnapshot(task));
  }

  private async cleanupTaskFiles(task: InternalTask, options?: { keepOutput?: boolean }): Promise<void> {
    if (!options?.keepOutput) {
      await rm(task.tempOutputPath, { force: true }).catch(() => {});
    }
    if (task.partPaths.length > 0) {
      await Promise.all(task.partPaths.map((path) => rm(path, { force: true }).catch(() => {})));
    }
    await rm(task.tempDir, { recursive: true, force: true }).catch(() => {});
  }

  private async handleTaskFailure(task: InternalTask, error: unknown): Promise<void> {
    if (task.status === 'paused') {
      task.speedBytesPerSecond = 0;
      task.estimatedFinishAt = null;
      task.updatedAt = Date.now();
      this.emitTask(task, true);
      return;
    }

    if (task.status === 'canceled' || isAbortError(error)) {
      task.status = 'canceled';
      task.speedBytesPerSecond = 0;
      task.estimatedFinishAt = null;
      task.updatedAt = Date.now();
      this.emitTask(task, true);
      await this.cleanupTaskFiles(task);
      return;
    }

    task.status = 'failed';
    task.errorMessage = error instanceof Error ? error.message : String(error);
    task.speedBytesPerSecond = 0;
    task.estimatedFinishAt = null;
    task.updatedAt = Date.now();
    this.emitTask(task, true);
    await this.cleanupTaskFiles(task);
  }
}
