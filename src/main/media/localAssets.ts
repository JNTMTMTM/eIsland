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
 * @file localAssets.ts
 * @description 为受控本地图片和字体提供有界授权 URL 与文件流。
 * @author 鸡哥
 */

import { randomUUID } from 'node:crypto';
import { open, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute } from 'node:path';
import { Readable } from 'node:stream';

const PREFIX = 'eisland-media://asset/';
const grants = new Map<string, { path: string; maxBytes: number }>();
const MIME: Record<string, string> = {
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.bmp': 'image/bmp',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

/**
 * 授予已校验的绝对资源路径随机令牌，注册表仅保留最多256个路径。
 * @param filePath - 用户选择或已保存的资源路径。
 * @param maxBytes - 压缩文件大小上限。
 * @returns 协议地址；资源无效时抛出错误。
 */
export async function createLocalAssetUrl(filePath: string, maxBytes: number): Promise<string> {
  if (!isAbsolute(filePath) || !MIME[extname(filePath).toLowerCase()]) throw new Error('Unsupported local asset');
  const path = await realpath(filePath);
  const info = await stat(path);
  if (!info.isFile() || info.size <= 0 || info.size > maxBytes) throw new Error('Local asset exceeds size limit');
  const existing = Array.from(grants).find(([, grant]) => grant.path === path && grant.maxBytes === maxBytes);
  const token = existing?.[0] ?? randomUUID();
  grants.delete(token);
  grants.set(token, { path, maxBytes });
  if (grants.size > 256) grants.delete(grants.keys().next().value!);
  return PREFIX + token;
}

/** 通过有界文件流提供令牌授权资源，拒绝猜测路径和已替换的大文件。 */
export async function handleLocalAssetRequest(request: Request): Promise<Response> {
  const token = request.url.slice(PREFIX.length).split(/[?#]/, 1)[0];
  const grant = request.url.startsWith(PREFIX) ? grants.get(token) : undefined;
  if (!grant) return new Response(null, { status: 403 });
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
  try {
    const path = await realpath(grant.path);
    if (path !== grant.path) return new Response(null, { status: 403 });
    const file = await open(path, 'r');
    let streaming = false;
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size <= 0 || info.size > grant.maxBytes) return new Response(null, { status: 413 });
      const headers = { 'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': String(info.size), 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
      if (request.method === 'HEAD') return new Response(null, { headers });
      request.signal.throwIfAborted();
      const stream = file.createReadStream({ highWaterMark: 64 * 1024, end: info.size - 1, signal: request.signal });
      const body = Readable.toWeb(stream, { strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength } }) as ReadableStream<Uint8Array>;
      streaming = true;
      return new Response(body, { headers });
    } finally { if (!streaming) await file.close(); }
  } catch { return new Response(null, { status: 404 }); }
}
