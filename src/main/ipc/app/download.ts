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
 * @file download.ts
 * @description 下载相关主进程 IPC 处理器注册。
 * @author 鸡哥
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { MultiThreadDownloadEngine, type DownloadTaskSnapshot } from '../../core/downloadEngine';
import type { RegisterDownloadIpcHandlersOptions, DownloadStartPayload } from './types';
import { MAX_PERSISTED_TASKS, PERSIST_DEBOUNCE_MS } from './config/download';

let registered = false;

function isDownloadTaskStatus(value: unknown): value is DownloadTaskSnapshot['status'] {
  return value === 'downloading' || value === 'paused' || value === 'completed' || value === 'failed' || value === 'canceled';
}

function toPersistableTask(raw: unknown): DownloadTaskSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== 'string'
    || typeof row.url !== 'string'
    || typeof row.savePath !== 'string'
    || typeof row.fileName !== 'string'
    || typeof row.totalBytes !== 'number'
    || typeof row.downloadedBytes !== 'number'
    || typeof row.progress !== 'number'
    || typeof row.speedBytesPerSecond !== 'number'
    || (row.estimatedFinishAt !== null && typeof row.estimatedFinishAt !== 'number')
    || typeof row.threads !== 'number'
    || !isDownloadTaskStatus(row.status)
    || typeof row.createdAt !== 'number'
    || typeof row.updatedAt !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    url: row.url,
    savePath: row.savePath,
    fileName: row.fileName,
    totalBytes: row.totalBytes,
    downloadedBytes: row.downloadedBytes,
    progress: row.progress,
    speedBytesPerSecond: row.speedBytesPerSecond,
    estimatedFinishAt: row.estimatedFinishAt,
    threads: row.threads,
    status: row.status,
    errorMessage: typeof row.errorMessage === 'string' ? row.errorMessage : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortTasks(tasks: DownloadTaskSnapshot[]): DownloadTaskSnapshot[] {
  return tasks.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeLoadedTasks(raw: unknown): DownloadTaskSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  const list: DownloadTaskSnapshot[] = [];
  const seen = new Set<string>();
  raw.forEach((item) => {
    const task = toPersistableTask(item);
    if (!task) return;
    if (seen.has(task.id)) return;
    seen.add(task.id);
    if (task.status === 'downloading') {
      task.status = 'failed';
      task.speedBytesPerSecond = 0;
      task.estimatedFinishAt = null;
      task.errorMessage = task.errorMessage || '应用重启后任务中断';
      task.updatedAt = now;
    }
    list.push(task);
  });
  return sortTasks(list).slice(0, MAX_PERSISTED_TASKS);
}

function loadPersistedTasks(storePath: string): DownloadTaskSnapshot[] {
  try {
    if (!existsSync(storePath)) return [];
    const content = readFileSync(storePath, 'utf-8');
    if (!content.trim()) return [];
    const parsed = JSON.parse(content);
    return normalizeLoadedTasks(parsed);
  } catch (error) {
    console.error('[Download] load persisted tasks error:', error);
    return [];
  }
}

function savePersistedTasks(storePath: string, tasks: DownloadTaskSnapshot[]): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify(sortTasks(tasks).slice(0, MAX_PERSISTED_TASKS), null, 2), 'utf-8');
  } catch (error) {
    console.error('[Download] save persisted tasks error:', error);
  }
}

function sanitizeThreads(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 8;
  return Math.max(1, Math.min(16, Math.floor(value)));
}

function sanitizeSuggestedName(input: unknown): string {
  if (typeof input !== 'string') return `download-${Date.now()}.bin`;
  const safe = input.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return safe || `download-${Date.now()}.bin`;
}

function normalizeStartPayload(payload: unknown): { url: string; savePath?: string; threads: number } {
  const row = (payload ?? {}) as DownloadStartPayload;
  const url = typeof row.url === 'string' ? row.url.trim() : '';
  const savePath = typeof row.savePath === 'string' ? row.savePath.trim() : '';
  const threads = sanitizeThreads(row.threads);
  return {
    url,
    savePath: savePath || undefined,
    threads,
  };
}

/**
 * 注册下载模块相关的 IPC 处理器。
 * @param options - IPC 注册配置项。
 */
export function registerDownloadIpcHandlers(options: RegisterDownloadIpcHandlersOptions): void {
  if (registered) return;
  registered = true;

  const taskStorePath = join(app.getPath('userData'), 'eIsland_store', 'download-tasks.json');
  const taskSnapshotMap = new Map<string, DownloadTaskSnapshot>();
  loadPersistedTasks(taskStorePath).forEach((task) => {
    taskSnapshotMap.set(task.id, task);
  });

  let persistTimer: NodeJS.Timeout | null = null;
  const persistSnapshots = (): void => {
    const tasks = Array.from(taskSnapshotMap.values());
    savePersistedTasks(taskStorePath, tasks);
  };
  const schedulePersist = (): void => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistSnapshots();
    }, PERSIST_DEBOUNCE_MS);
  };

  const upsertTaskSnapshot = (task: DownloadTaskSnapshot): void => {
    taskSnapshotMap.set(task.id, task);
    if (taskSnapshotMap.size <= MAX_PERSISTED_TASKS) return;
    // 活动或暂停任务不能因历史淘汰失去控制入口。
    const all = sortTasks(Array.from(taskSnapshotMap.values()));
    const active = all.filter((item) => item.status === 'downloading' || item.status === 'paused');
    const history = all.filter((item) => item.status !== 'downloading' && item.status !== 'paused');
    const trimmed = [...active, ...history.slice(0, Math.max(0, MAX_PERSISTED_TASKS - active.length))];
    const retained = new Set(trimmed.map((item) => item.id));
    taskSnapshotMap.forEach((_value, id) => { if (!retained.has(id)) engine.removeTask(id); });
    taskSnapshotMap.clear();
    trimmed.forEach((item) => taskSnapshotMap.set(item.id, item));
  };

  const emitToRenderer = (task: DownloadTaskSnapshot): void => {
    upsertTaskSnapshot(task);
    schedulePersist();
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win.isDestroyed()) return;
      try {
        win.webContents.send('download:task-updated', task);
      } catch {
        // ignore
      }
    });
  };

  const engine = new MultiThreadDownloadEngine({
    onTaskUpdated: emitToRenderer,
  });

  ipcMain.handle('download:start', async (_event, payload: unknown) => {
    try {
      const normalized = normalizeStartPayload(payload);
      if (!normalized.url) {
        return { ok: false, message: '下载地址不能为空' } as const;
      }
      const task = await engine.startDownload({
        url: normalized.url,
        savePath: normalized.savePath,
        threads: normalized.threads,
        defaultDir: options.getDownloadsPath(),
      });
      upsertTaskSnapshot(task);
      schedulePersist();
      return { ok: true, task } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message } as const;
    }
  });

  ipcMain.handle('download:cancel', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    return engine.cancelDownload(id);
  });

  ipcMain.handle('download:pause', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    return engine.pauseDownload(id);
  });

  ipcMain.handle('download:resume', async (_event, taskId: unknown) => {
    try {
      const id = typeof taskId === 'string' ? taskId.trim() : '';
      if (!id) return { ok: false, message: '任务标识不能为空' } as const;
      const task = await engine.resumeDownload(id);
      upsertTaskSnapshot(task);
      schedulePersist();
      return { ok: true, task } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message } as const;
    }
  });

  ipcMain.handle('download:remove', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    const snapshot = taskSnapshotMap.get(id);
    if (!snapshot) return false;

    const removedFromEngine = engine.removeTask(id);
    if (!removedFromEngine && snapshot.status === 'downloading') {
      return false;
    }

    taskSnapshotMap.delete(id);
    schedulePersist();
    return true;
  });

  ipcMain.handle('download:list', () => {
    return sortTasks(Array.from(taskSnapshotMap.values()));
  });

  ipcMain.handle('download:get', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return null;
    return taskSnapshotMap.get(id) ?? null;
  });

  ipcMain.handle('download:pick-save-path', async (event, suggestedName: unknown) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const fileName = sanitizeSuggestedName(suggestedName);
      const result = await dialog.showSaveDialog(win, {
        title: '选择保存位置',
        defaultPath: join(options.getDownloadsPath(), fileName),
      });
      if (result.canceled) return null;
      return result.filePath ?? null;
    } catch (error) {
      console.error('[Download] pick save path error:', error);
      return null;
    }
  });

  ipcMain.handle('download:get-default-dir', () => {
    return options.getDownloadsPath() || app.getPath('downloads');
  });
}
