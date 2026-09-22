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
 * @file albumMedia.ts
 * @description 仅向相册已保存的视频提供按需文件流，避免完整文件跨 IPC 复制。
 * @author 鸡哥
 */

import { open, readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { app } from 'electron';

const ALBUM_MEDIA_PREFIX = 'eisland-media://album/';
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

/**
 * 校验视频路径是否仍在用户保存的相册中。
 * @param filePath - 待校验的绝对文件路径
 * @returns 标准化的授权路径；相册外路径返回 null
 */
async function resolveAlbumVideo(filePath: unknown): Promise<string | null> {
  if (typeof filePath !== 'string' || !isAbsolute(filePath)) return null;
  const normalized = resolve(filePath);
  if (!VIDEO_EXTENSIONS.has(extname(normalized).toLowerCase())) return null;
  const storePath = join(app.getPath('userData'), 'eIsland_store', 'photo-album-items.json');
  const items: unknown = JSON.parse(await readFile(storePath, 'utf8'));
  if (!Array.isArray(items)) return null;
  return items.some((item: unknown) => {
    if (!item || typeof item !== 'object' || !('path' in item) || typeof item.path !== 'string') return false;
    return resolve(item.path).toLowerCase() === normalized.toLowerCase();
  }) ? normalized : null;
}

/**
 * 获取已保存相册视频的流式地址和文件大小，不读取视频内容。
 * @param filePath - 相册视频的绝对路径
 * @returns 已授权的地址和大小；无效或不可用时返回 null
 */
export async function getAlbumMediaInfo(filePath: unknown): Promise<{ url: string; sizeBytes: number } | null> {
  try {
    const path = await resolveAlbumVideo(filePath);
    if (!path) return null;
    const info = await stat(path);
    if (!info.isFile()) return null;
    return { url: `${ALBUM_MEDIA_PREFIX}${encodeURIComponent(path)}`, sizeBytes: info.size };
  } catch {
    return null;
  }
}

/**
 * 按请求流式读取已保存的视频，保留 Range/HEAD 以支持元数据读取和拖动进度。
 * @param request - 相册媒体协议请求
 * @returns 文件流响应；相册外路径返回 403
 */
export async function handleAlbumMediaRequest(request: Request): Promise<Response> {
  try {
    if (!request.url.startsWith(ALBUM_MEDIA_PREFIX)) return new Response(null, { status: 400 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
    const [encodedPath] = request.url.slice(ALBUM_MEDIA_PREFIX.length).split(/[?#]/, 1);
    const path = await resolveAlbumVideo(decodeURIComponent(encodedPath));
    if (!path) return new Response(null, { status: 403 });
    request.signal.throwIfAborted();
    const file = await open(path, 'r');
    let streamed = false;
    try {
      const info = await file.stat();
      if (!info.isFile()) return new Response(null, { status: 404 });
      const range = request.method === 'HEAD' ? null : request.headers.get('range');
      const match = range?.match(/^bytes=(\d*)-(\d*)$/i);
      let start = match?.[1] ? Number(match[1]) : 0;
      if (match && !match[1] && match[2]) start = Math.max(0, info.size - Number(match[2]));
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (range && (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start)
        || !Number.isSafeInteger(end) || start > end || start >= info.size)) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
      }
      const extension = extname(path).toLowerCase();
      const contentTypes: Record<string, string> = { '.webm': 'video/webm', '.mov': 'video/quicktime' };
      const origin = request.headers.get('origin');
      const rendererUrl = process.env.ELECTRON_RENDERER_URL;
      const allowOrigin = origin === 'null' || (rendererUrl && origin === new URL(rendererUrl).origin);
      const headers = {
        'Accept-Ranges': 'bytes',
        'Content-Type': contentTypes[extension] ?? 'video/mp4',
        'Content-Length': String(Math.max(0, end - start + 1)),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}),
        ...(origin && allowOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
      };
      if (request.method === 'HEAD' || info.size === 0) return new Response(null, { headers });
      const stream = file.createReadStream({ start, end, signal: request.signal, highWaterMark: 64 * 1024 });
      const body = Readable.toWeb(stream, {
        strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength },
      }) as ReadableStream<Uint8Array>;
      streamed = true;
      return new Response(body, { headers, status: range ? 206 : 200 });
    } finally {
      if (!streamed) await file.close();
    }
  } catch {
    return new Response(null, { status: 404 });
  }
}
