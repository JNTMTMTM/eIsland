/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file index.ts
 * @description 汽水音乐受限播放地址注册与主进程音频代理。
 * @author 鸡哥
 */

import { randomUUID } from 'crypto';
import { decryptQishuiAudio } from './decrypt';

const ENTRY_TTL_MS = 5 * 60 * 1000;
const entries = new Map<string, { sourceUrl: string; playAuth: string; expiresAt: number }>();

function responseHeaders(contentType: string, length: number, range?: string): HeadersInit {
  return {
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    'Content-Length': String(length),
    ...(range ? { 'Content-Range': range } : {}),
  };
}

function rangedResponse(buffer: Buffer, contentType: string, rangeHeader: string | null): Response {
  const match = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return new Response(buffer, { status: 200, headers: responseHeaders(contentType, buffer.length) });
  const start = match[1] ? Number(match[1]) : 0;
  const end = Math.min(match[2] ? Number(match[2]) : buffer.length - 1, buffer.length - 1);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= buffer.length) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buffer.length}` } });
  }
  const chunk = buffer.subarray(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: responseHeaders(contentType, chunk.length, `bytes ${start}-${end}/${buffer.length}`),
  });
}

/**
 * 注册一次性受限播放入口，避免向渲染进程暴露上游地址和 play_auth。
 * @param sourceUrl - 汽水音频上游 HTTPS 地址
 * @param playAuth - 可选的加密播放密钥
 * @returns 可由渲染进程加载的受限协议地址
 */
export function registerQishuiAudioSource(sourceUrl: string, playAuth = ''): string {
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== 'https:') throw new Error('QISHUI_AUDIO_URL_INVALID');
  const token = randomUUID();
  entries.set(token, { sourceUrl: parsed.toString(), playAuth, expiresAt: Date.now() + ENTRY_TTL_MS });
  return `eisland-qishui://audio/${token}`;
}

/**
 * 处理 eisland-qishui 音频代理请求。
 * @param request - Chromium 协议请求
 * @returns 支持 Range 的音频响应
 */
export async function handleQishuiAudioRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.pathname.replace(/^\//, '');
  const entry = entries.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    entries.delete(token);
    return new Response('Not Found', { status: 404 });
  }
  try {
    const upstream = await fetch(entry.sourceUrl, { signal: AbortSignal.timeout(30_000) });
    if (!upstream.ok) return new Response('Bad Gateway', { status: 502 });
    const encrypted = Buffer.from(await upstream.arrayBuffer());
    const audio = entry.playAuth
      ? decryptQishuiAudio(encrypted, entry.playAuth)
      : { buffer: encrypted, contentType: upstream.headers.get('content-type') || 'audio/mp4' };
    return rangedResponse(audio.buffer, audio.contentType, request.headers.get('range'));
  } catch {
    return new Response('Bad Gateway', { status: 502 });
  }
}