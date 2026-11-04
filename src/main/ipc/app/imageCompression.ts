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
 * @file imageCompression.ts
 * @description 图片压缩 IPC 处理模块
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { getFfmpegBinary } from '../../utils/ffmpegPath';
import type { ImageCompressionStartPayload, ImageCompressionTaskResult, ImageCompressionStartResult } from './types';
import { IMAGE_EXTENSIONS, MAX_PERSISTED_TASKS, PERSIST_DEBOUNCE_MS } from './config/imageCompression';

function sortTasks(tasks: ImageCompressionTaskResult[]): ImageCompressionTaskResult[] {
  return tasks.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function toPersistableTask(raw: unknown): ImageCompressionTaskResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== 'string'
    || typeof row.fileName !== 'string'
    || typeof row.inputPath !== 'string'
    || typeof row.outputPath !== 'string'
    || typeof row.quality !== 'number'
    || (row.status !== 'completed' && row.status !== 'failed')
    || typeof row.success !== 'boolean'
    || typeof row.originalBytes !== 'number'
    || typeof row.compressedBytes !== 'number'
    || typeof row.ratio !== 'number'
    || typeof row.createdAt !== 'number'
    || typeof row.updatedAt !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    fileName: row.fileName,
    inputPath: row.inputPath,
    outputPath: row.outputPath,
    quality: row.quality,
    status: row.status,
    success: row.success,
    originalBytes: row.originalBytes,
    compressedBytes: row.compressedBytes,
    ratio: row.ratio,
    error: typeof row.error === 'string' ? row.error : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function loadPersistedTasks(storePath: string): ImageCompressionTaskResult[] {
  try {
    if (!existsSync(storePath)) return [];
    const content = readFileSync(storePath, 'utf-8');
    if (!content.trim()) return [];
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    const list = parsed
      .map((item) => toPersistableTask(item))
      .filter((item): item is ImageCompressionTaskResult => Boolean(item));
    return sortTasks(list).slice(0, MAX_PERSISTED_TASKS);
  } catch (error) {
    console.error('[ImageCompression] load persisted tasks error:', error);
    return [];
  }
}

function savePersistedTasks(storePath: string, tasks: ImageCompressionTaskResult[]): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify(sortTasks(tasks).slice(0, MAX_PERSISTED_TASKS), null, 2), 'utf-8');
  } catch (error) {
    console.error('[ImageCompression] save persisted tasks error:', error);
  }
}

let registered = false;

function buildTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeQuality(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 80;
  return Math.max(10, Math.min(100, Math.floor(raw)));
}

function toImagePathList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  raw.forEach((item) => {
    if (typeof item !== 'string') return;
    const value = item.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    list.push(value);
  });
  return list;
}

function normalizeOutputDir(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  return value || fallback;
}

function mapQualityToJpegQscale(quality: number): number {
  const q = 31 - Math.round((quality / 100) * 29);
  return Math.max(2, Math.min(31, q));
}

function mapQualityToPngCompressionLevel(quality: number): number {
  const level = Math.round(((100 - quality) / 100) * 9);
  return Math.max(0, Math.min(9, level));
}

function createOutputPath(inputPath: string, outputDir: string): string {
  const sourceExt = extname(inputPath);
  const sourceBase = basename(inputPath, sourceExt);
  const ext = sourceExt || '.jpg';
  let index = 0;
  while (true) {
    const suffix = index === 0 ? '_compressed' : `_compressed_${index}`;
    const outputPath = join(outputDir, `${sourceBase}${suffix}${ext}`);
    if (!existsSync(outputPath)) return outputPath;
    index += 1;
  }
}

function runFfmpeg(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(getFfmpegBinary(), args, { windowsHide: true });
    } catch (err) {
      reject(err);
      return;
    }
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? -1, stderr });
    });
  });
}

async function compressImage(inputPath: string, outputPath: string, quality: number): Promise<{ success: boolean; error?: string }> {
  const ext = extname(inputPath).toLowerCase().replace('.', '');
  const args: string[] = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath];

  if (ext === 'jpg' || ext === 'jpeg') {
    args.push('-q:v', String(mapQualityToJpegQscale(quality)));
  } else if (ext === 'png') {
    args.push('-compression_level', String(mapQualityToPngCompressionLevel(quality)));
  } else if (ext === 'webp') {
    args.push('-quality', String(quality));
  } else if (ext === 'bmp') {
    // BMP 无有损质量控制，按无额外参数输出（体积可能不减）
  } else {
    return { success: false, error: 'unsupported image format' };
  }

  args.push(outputPath);

  try {
    const result = await runFfmpeg(args);
    if (result.code !== 0 || !existsSync(outputPath)) {
      const message = result.stderr?.split('\n').filter((line) => line.trim()).pop() ?? 'ffmpeg exited with non-zero code';
      return { success: false, error: message };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT')) {
      return { success: false, error: 'ffmpeg not found. Please install ffmpeg and add it to your PATH.' };
    }
    return { success: false, error: message };
  }
}

/**
 * 注册图片压缩模块 IPC
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function registerImageCompressionIpcHandlers(): void {
  if (registered) return;
  registered = true;

  const taskStorePath = join(app.getPath('userData'), 'eIsland_store', 'image-compression-tasks.json');
  const taskSnapshotMap = new Map<string, ImageCompressionTaskResult>();
  loadPersistedTasks(taskStorePath).forEach((task) => {
    taskSnapshotMap.set(task.id, task);
  });

  let persistTimer: NodeJS.Timeout | null = null;
  const persistSnapshots = (): void => {
    const tasks = Array.from(taskSnapshotMap.values());
    savePersistedTasks(taskStorePath, tasks);
  };
  const schedulePersist = (): void => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistSnapshots();
    }, PERSIST_DEBOUNCE_MS);
  };

  const upsertTaskSnapshot = (task: ImageCompressionTaskResult): void => {
    taskSnapshotMap.set(task.id, task);
    if (taskSnapshotMap.size <= MAX_PERSISTED_TASKS) return;
    const trimmed = sortTasks(Array.from(taskSnapshotMap.values())).slice(0, MAX_PERSISTED_TASKS);
    taskSnapshotMap.clear();
    trimmed.forEach((item) => taskSnapshotMap.set(item.id, item));
  };

  const emitToRenderer = (task: ImageCompressionTaskResult): void => {
    upsertTaskSnapshot(task);
    schedulePersist();
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win.isDestroyed()) return;
      try {
        win.webContents.send('image-compression:task-updated', task);
      } catch {
        // ignore
      }
    });
  };

  ipcMain.handle('image-compression:pick-images', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return [];
      const result = await dialog.showOpenDialog(win, {
        title: '选择图片文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Images', extensions: Array.from(IMAGE_EXTENSIONS) },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled) return [];
      return result.filePaths || [];
    } catch (error) {
      console.error('[ImageCompression] pick-images error:', error);
      return [];
    }
  });

  ipcMain.handle('image-compression:pick-output-dir', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择输出目录',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0] ?? null;
    } catch (error) {
      console.error('[ImageCompression] pick-output-dir error:', error);
      return null;
    }
  });

  ipcMain.handle('image-compression:start', async (_event, payload: ImageCompressionStartPayload): Promise<ImageCompressionStartResult> => {
    const inputPaths = toImagePathList(payload?.inputPaths);
    if (inputPaths.length === 0) {
      return { ok: false, message: '请选择至少一张图片' };
    }

    const quality = sanitizeQuality(payload?.quality);
    const fallbackDir = dirname(inputPaths[0]);
    const outputDir = normalizeOutputDir(payload?.outputDir, fallbackDir);

    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message };
    }

    const results: ImageCompressionTaskResult[] = [];

    await inputPaths.reduce<Promise<void>>(async (previousTaskPromise, inputPath) => {
      await previousTaskPromise;

      const createdAt = Date.now();
      const id = buildTaskId();
      const fileName = basename(inputPath);
      let originalBytes = 0;
      try {
        originalBytes = statSync(inputPath).size;
      } catch {
        const failedTask: ImageCompressionTaskResult = {
          id,
          fileName,
          inputPath,
          outputPath: '',
          quality,
          status: 'failed',
          success: false,
          originalBytes: 0,
          compressedBytes: 0,
          ratio: 0,
          error: 'source file not found',
          createdAt,
          updatedAt: Date.now(),
        };
        results.push(failedTask);
        emitToRenderer(failedTask);
        return;
      }

      const ext = extname(inputPath).toLowerCase().replace('.', '');
      if (!IMAGE_EXTENSIONS.has(ext)) {
        const failedTask: ImageCompressionTaskResult = {
          id,
          fileName,
          inputPath,
          outputPath: '',
          quality,
          status: 'failed',
          success: false,
          originalBytes,
          compressedBytes: 0,
          ratio: 0,
          error: 'unsupported image format',
          createdAt,
          updatedAt: Date.now(),
        };
        results.push(failedTask);
        emitToRenderer(failedTask);
        return;
      }

      const outputPath = createOutputPath(inputPath, outputDir);
      const compressed = await compressImage(inputPath, outputPath, quality);
      if (!compressed.success) {
        const failedTask: ImageCompressionTaskResult = {
          id,
          fileName,
          inputPath,
          outputPath,
          quality,
          status: 'failed',
          success: false,
          originalBytes,
          compressedBytes: 0,
          ratio: 0,
          error: compressed.error || 'compression failed',
          createdAt,
          updatedAt: Date.now(),
        };
        results.push(failedTask);
        emitToRenderer(failedTask);
        return;
      }

      let compressedBytes = 0;
      try {
        compressedBytes = statSync(outputPath).size;
      } catch {
        const failedTask: ImageCompressionTaskResult = {
          id,
          fileName,
          inputPath,
          outputPath,
          quality,
          status: 'failed',
          success: false,
          originalBytes,
          compressedBytes: 0,
          ratio: 0,
          error: 'output file not found',
          createdAt,
          updatedAt: Date.now(),
        };
        results.push(failedTask);
        emitToRenderer(failedTask);
        return;
      }

      const ratio = originalBytes > 0 ? (originalBytes - compressedBytes) / originalBytes : 0;
      const successTask: ImageCompressionTaskResult = {
        id,
        fileName,
        inputPath,
        outputPath,
        quality,
        status: 'completed',
        success: true,
        originalBytes,
        compressedBytes,
        ratio,
        createdAt,
        updatedAt: Date.now(),
      };
      results.push(successTask);
      emitToRenderer(successTask);
    }, Promise.resolve());

    return {
      ok: true,
      results,
    };
  });

  ipcMain.handle('image-compression:list', () => {
    return sortTasks(Array.from(taskSnapshotMap.values()));
  });

  ipcMain.handle('image-compression:remove', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    const existed = taskSnapshotMap.delete(id);
    if (!existed) return false;
    schedulePersist();
    return true;
  });
}
