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
 * @file index.ts
 * @description 下载引擎通用工具函数。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { createReadStream, createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import { basename, join } from 'path';
import { pipeline } from 'stream/promises';
import { DEFAULT_THREADS, MAX_THREADS, MIN_CHUNK_BYTES, MIN_THREADS } from '../config';
import type { ChunkInfo } from '../../../types/core/ChunkInfo';

export type { ChunkInfo };

/**
 * 标准化并限制下载线程数。
 * @param value - 输入线程数。
 * @returns 合法范围内的线程数。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function normalizeThreads(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_THREADS;
  return Math.max(MIN_THREADS, Math.min(MAX_THREADS, Math.floor(value)));
}

/**
 * 从 Content-Disposition 响应头中解析文件名。
 * @param headerValue - 响应头原始值。
 * @returns 解析后的文件名，失败时返回空字符串。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function parseContentDispositionFileName(headerValue: string): string {
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(headerValue);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const simpleMatch = /filename\s*=\s*"?([^";]+)"?/i.exec(headerValue);
  if (simpleMatch && simpleMatch[1]) {
    return simpleMatch[1].trim();
  }
  return '';
}

/**
 * 根据 URL 推断默认文件名。
 * @param url - 下载地址。
 * @returns 推断得到的文件名。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function inferFileNameFromUrl(url: URL): string {
  const fromPath = basename(decodeURIComponent(url.pathname || ''));
  if (fromPath && fromPath !== '/' && fromPath !== '.') {
    return fromPath;
  }
  return `download-${Date.now()}.bin`;
}

/**
 * 将文件名清洗为跨平台安全格式。
 * @param input - 原始文件名。
 * @returns 清洗后的文件名。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function safeFileName(input: string): string {
  const safe = input.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  if (!safe) return `download-${Date.now()}.bin`;
  return safe.slice(0, 180);
}

/**
 * 判断错误是否为中止下载导致的异常。
 * @param error - 任意异常对象。
 * @returns 是否为 AbortError。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || /aborted|abort/i.test(error.message);
}

/**
 * 按线程数将总字节数拆分为分片区间。
 * @param totalBytes - 文件总字节数。
 * @param threads - 线程数。
 * @param tempDir - 分片临时目录。
 * @returns 分片信息列表。
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function buildChunks(totalBytes: number, threads: number, tempDir: string): ChunkInfo[] {
  const targetThreads = Math.max(1, Math.min(threads, Math.floor(totalBytes / MIN_CHUNK_BYTES) || 1));
  const chunkSize = Math.ceil(totalBytes / targetThreads);
  const chunks: ChunkInfo[] = [];
  let start = 0;
  for (let index = 0; index < targetThreads; index++) {
    const end = index === targetThreads - 1 ? totalBytes - 1 : Math.min(totalBytes - 1, start + chunkSize - 1);
    chunks.push({
      index,
      start,
      end,
      partPath: join(tempDir, `chunk-${index}.part`),
    });
    start = end + 1;
  }
  return chunks;
}

export async function mergePartFiles(partPaths: string[], outputPath: string): Promise<void> {
  await rm(outputPath, { force: true }).catch(() => {});
  const writeStream = createWriteStream(outputPath, { flags: 'w' });
  for (let index = 0; index < partPaths.length; index++) {
    await pipeline(createReadStream(partPaths[index]), writeStream, { end: false });
  }
  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });
}
