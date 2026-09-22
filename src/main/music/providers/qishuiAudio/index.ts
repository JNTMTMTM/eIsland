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
import { createReadStream, openSync } from 'fs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { decryptQishuiAudio } from './decrypt';

/* eslint-disable no-param-reassign, promise/prefer-await-to-then -- 共享入口需原地更新；队列和后台文件清理不能阻塞协议响应。 */

const ENTRY_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 32;
const MAX_BUFFERED_BYTES = 128 * 1024 * 1024;
const MAX_DISK_CACHE_BYTES = 256 * 1024 * 1024;
const MAX_PENDING_LOADS = 8;

/** 解密结果落盘后仅保留路径，避免播放期间长期持有整曲 Buffer。 */
interface CachedAudio {
  path: string;
  length: number;
  contentType: string;
}

/** 同一播放入口的 Range 请求共享下载和解密任务。 */
interface AudioEntry {
  sourceUrl: string;
  playAuth: string;
  expiresAt: number;
  audio?: CachedAudio;
  pending?: Promise<CachedAudio>;
  controller?: AbortController;
  waiters: number;
}

const entries = new Map<string, AudioEntry>();
let cacheDirectory: Promise<string> | undefined;
let loadTail: Promise<void> = Promise.resolve();
let pendingLoads = 0;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let cleanupPromise: Promise<void> | undefined;

function discardAudio(entry: AudioEntry): void {
  const { audio } = entry;
  entry.audio = undefined;
  if (audio) void rm(audio.path, { force: true }).catch(() => {});
}

function pruneEntries(): void {
  if (expiryTimer) clearTimeout(expiryTimer);
  const now = Date.now();
  entries.forEach((entry, token) => {
    if (entry.expiresAt > now) return;
    entry.controller?.abort();
    discardAudio(entry);
    entries.delete(token);
  });
  if (entries.size) {
    const expiresAt = Math.min(...Array.from(entries.values(), (entry) => entry.expiresAt));
    expiryTimer = setTimeout(pruneEntries, Math.max(1, expiresAt - now));
    expiryTimer.unref();
  } else {
    expiryTimer = undefined;
  }
}

function responseHeaders(contentType: string, length: number, range?: string): HeadersInit {
  return {
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    'Content-Length': String(length),
    ...(range ? { 'Content-Range': range } : {}),
  };
}

function rangedResponse(audio: CachedAudio, rangeHeader: string | null, head = false, signal?: AbortSignal): Response {
  signal?.throwIfAborted();
  const match = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/i);
  const { length } = audio;
  let start = match?.[1] ? Number(match[1]) : 0;
  if (match && !match[1] && match[2]) start = Math.max(0, length - Number(match[2]));
  const end = Math.min(match?.[1] && match[2] ? Number(match[2]) : length - 1, length - 1);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= length) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } });
  }
  // 先打开文件描述符，保证后续缓存淘汰不影响已经开始的 Range 响应。
  const body = head ? null : Readable.toWeb(createReadStream(audio.path, {
    start, end, signal, fd: openSync(audio.path, 'r'),
  }), { strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength } }) as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: match ? 206 : 200,
    headers: responseHeaders(audio.contentType, end - start + 1, match ? `bytes ${start}-${end}/${length}` : undefined),
  });
}

async function readBoundedAudio(upstream: Response, signal: AbortSignal): Promise<Buffer> {
  const declaredLength = Number(upstream.headers.get('content-length'));
  if (declaredLength > MAX_BUFFERED_BYTES) {
    await upstream.body?.cancel();
    throw new Error('QISHUI_AUDIO_TOO_LARGE');
  }
  if (!upstream.body) return Buffer.alloc(0);
  const reader = upstream.body.getReader();
  const cancelRead = (): void => { reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', cancelRead, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      // eslint-disable-next-line no-await-in-loop -- 必须按消费速度逐块读取，避免排队大量 read 请求。
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BUFFERED_BYTES) throw new Error('QISHUI_AUDIO_TOO_LARGE');
      chunks.push(value);
    }
    signal.throwIfAborted();
    return Buffer.concat(chunks, length);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener('abort', cancelRead);
    reader.releaseLock();
  }
}

function loadBufferedAudio(entry: AudioEntry, upstream?: Response): Promise<CachedAudio> {
  if (entry.audio || entry.pending || pendingLoads >= MAX_PENDING_LOADS) {
    if (upstream?.body) upstream.body.cancel().catch(() => {});
    if (entry.audio) return Promise.resolve(entry.audio);
    if (entry.pending) return entry.pending;
    return Promise.reject(new Error('QISHUI_AUDIO_BUSY'));
  }
  pendingLoads += 1;
  const controller = new AbortController();
  entry.controller = controller;
  // 串行处理整曲解密，切歌或并发 Range 请求不会叠加多个大文件的峰值分配。
  const pending = loadTail.then(async () => {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    signal.throwIfAborted();
    const response = upstream ?? await fetch(entry.sourceUrl, { signal });
    if (!response.ok || response.status === 206) {
      await response.body?.cancel();
      throw new Error('QISHUI_AUDIO_UPSTREAM_INVALID');
    }
    const encrypted = await readBoundedAudio(response, signal);
    signal.throwIfAborted();
    const audio = entry.playAuth
      ? decryptQishuiAudio(encrypted, entry.playAuth)
      : { buffer: encrypted, contentType: response.headers.get('content-type') || 'audio/mp4' };
    if (!cacheDirectory) cacheDirectory = mkdtemp(join(tmpdir(), 'eisland-qishui-'));
    const path = join(await cacheDirectory, randomUUID());
    try {
      await writeFile(path, audio.buffer, { signal });
      signal.throwIfAborted();
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    let cacheBytes = audio.buffer.length;
    entries.forEach((existing) => { cacheBytes += existing.audio?.length ?? 0; });
    entries.forEach((existing) => {
      if (cacheBytes <= MAX_DISK_CACHE_BYTES) return;
      cacheBytes -= existing.audio?.length ?? 0;
      discardAudio(existing);
    });
    entry.audio = { path, length: audio.buffer.length, contentType: audio.contentType };
    return entry.audio;
  }).finally(() => {
    if (upstream?.body && !upstream.body.locked) void upstream.body.cancel().catch(() => {});
    entry.pending = undefined;
    entry.controller = undefined;
    pendingLoads -= 1;
  });
  entry.pending = pending;
  loadTail = pending.then(() => {}, () => {});
  return pending;
}

async function waitForAudio(entry: AudioEntry, signal: AbortSignal, upstream?: Response): Promise<CachedAudio> {
  signal.throwIfAborted();
  entry.waiters += 1;
  let onAbort: (() => void) | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/return-await -- 等待完成后才能移除取消监听并释放共享下载的等待者。
    return await Promise.race([
      loadBufferedAudio(entry, upstream),
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Promise 取消分支不会成功，保留未使用的 resolve 参数占位。
      new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new Error('QISHUI_AUDIO_REQUEST_ABORTED', { cause: signal.reason }));
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
    entry.waiters -= 1;
    if (!entry.waiters && entry.pending) entry.controller?.abort();
  }
}

/**
 * 注册一次性受限播放入口，避免向渲染进程暴露上游地址和 play_auth。
 * @param sourceUrl - 汽水音频上游 HTTPS 地址
 * @param playAuth - 可选的加密播放密钥
 * @returns 可由渲染进程加载的受限协议地址
 */
export function registerQishuiAudioSource(sourceUrl: string, playAuth = ''): string {
  if (cleanupPromise) throw new Error('QISHUI_AUDIO_SHUTTING_DOWN');
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== 'https:') throw new Error('QISHUI_AUDIO_URL_INVALID');
  pruneEntries();
  while (entries.size >= MAX_ENTRIES) {
    const oldestToken = entries.keys().next().value!;
    const oldestEntry = entries.get(oldestToken)!;
    oldestEntry.controller?.abort();
    discardAudio(oldestEntry);
    entries.delete(oldestToken);
  }
  const token = randomUUID();
  entries.set(token, { playAuth, sourceUrl: parsed.toString(), expiresAt: Date.now() + ENTRY_TTL_MS, waiters: 0 });
  pruneEntries();
  return `eisland-qishui://audio/${token}`;
}

/**
 * 处理 eisland-qishui 音频代理请求。
 * @param request - Chromium 协议请求
 * @returns 支持 Range 的音频响应
 */
export async function handleQishuiAudioRequest(request: Request): Promise<Response> {
  if (cleanupPromise) return new Response('Service Unavailable', { status: 503 });
  pruneEntries();
  const url = new URL(request.url);
  const token = url.pathname.replace(/^\//, '');
  const entry = entries.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    entries.delete(token);
    return new Response('Not Found', { status: 404 });
  }
  let detachUpstreamAbort: (() => void) | undefined;
  try {
    request.signal.throwIfAborted();
    const rangeHeader = request.headers.get('range');
    if (entry.playAuth || entry.audio || entry.pending) {
      const audio = await waitForAudio(entry, request.signal);
      return rangedResponse(audio, rangeHeader, request.method === 'HEAD', request.signal);
    }
    const upstreamController = new AbortController();
    const abortUpstream = (): void => upstreamController.abort();
    request.signal.addEventListener('abort', abortUpstream, { once: true });
    detachUpstreamAbort = () => request.signal.removeEventListener('abort', abortUpstream);
    const upstream = await fetch(entry.sourceUrl, {
      signal: AbortSignal.any([upstreamController.signal, AbortSignal.timeout(30_000)]),
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: rangeHeader ? { range: rangeHeader } : undefined,
    });
    if (entries.get(token) !== entry) {
      detachUpstreamAbort();
      await upstream.body?.cancel();
      return new Response('Not Found', { status: 404 });
    }
    if (!upstream.ok) {
      detachUpstreamAbort();
      await upstream.body?.cancel();
      return new Response('Bad Gateway', { status: 502 });
    }
    // 普通首播及上游 206 响应直接流式转发，背压由 Chromium 消费速度决定。
    if (!rangeHeader || upstream.status === 206 || request.method === 'HEAD') {
      const headers = new Headers(upstream.headers);
      if (!headers.has('content-type')) headers.set('content-type', 'audio/mp4');
      return new Response(upstream.body, { headers, status: upstream.status });
    }
    // 上游忽略 Range 后下载会被多个请求共享，取消权交给共享任务的等待者计数。
    detachUpstreamAbort();
    const audio = await waitForAudio(entry, request.signal, upstream);
    return rangedResponse(audio, rangeHeader, false, request.signal);
  } catch {
    detachUpstreamAbort?.();
    return new Response('Bad Gateway', { status: 502 });
  }
}

/**
 * 停止音频代理下载并删除本次进程创建的临时音频缓存。
 * @returns 清理完成后的 Promise
 */
export async function cleanupQishuiAudioSources(): Promise<void> {
  if (cleanupPromise) return cleanupPromise;
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = undefined;
  entries.forEach((entry) => entry.controller?.abort());
  entries.clear();
  cleanupPromise = (async () => {
    await loadTail;
    const directory = cacheDirectory;
    cacheDirectory = undefined;
    if (directory) await rm(await directory, { recursive: true, force: true });
  })().finally(() => { cleanupPromise = undefined; });
  return cleanupPromise;
}

/* eslint-enable no-param-reassign, promise/prefer-await-to-then -- 共享入口与后台队列实现结束。 */
