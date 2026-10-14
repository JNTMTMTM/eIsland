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
 * @file urlWatcher.ts
 * @description 剪贴板 URL 监听器模块
 * @description 监控剪贴板内容变化，检测 URL 并获取页面标题
 * @author 鸡哥
 */

import { BrowserWindow, clipboard, net } from 'electron';
import { extractUrls, isUrlBlacklisted, type ClipboardUrlDetectMode } from '../utils/clipboardUrl';

interface ClipboardUrlWatcherOptions {
  getWindow: () => BrowserWindow | null;
  getEnabled: () => boolean;
  getDetectMode: () => ClipboardUrlDetectMode;
  getBlacklist: () => string[];
}

let lastClipboardText = '';
let clipboardPollTimer: ReturnType<typeof setInterval> | null = null;
let titleRequest: AbortController | null = null;
let requestVersion = 0;

function extractHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

/** 限制最大字节数防止大文件 OOM */
const TITLE_FETCH_MAX_BYTES = 8192;

async function fetchPageTitle(url: string, signal: AbortSignal, timeoutMs = 3000): Promise<string> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let response: Response | undefined;
  let cancelWait: () => void = () => {};
  // 读正文也必须受截止时间约束，不能仅依赖服务器断开连接。
  const canceled = new Promise<never>((_resolve, reject) => {
    cancelWait = () => reject(new Error('Clipboard title request canceled'));
    controller.signal.addEventListener('abort', cancelWait, { once: true });
  });
  try {
    controller.signal.throwIfAborted();
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';

    const resp = await Promise.race([net.fetch(parsed.href, {
      signal: controller.signal as never,
      headers: { 'User-Agent': 'Mozilla/5.0', Range: 'bytes=0-8191' },
      redirect: 'follow',
    }), canceled]);
    response = resp;
    if (!resp.ok && resp.status !== 206) return '';

    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return '';

    reader = resp.body?.getReader();
    if (!reader) return '';
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < TITLE_FETCH_MAX_BYTES) {
      const { done, value } = await Promise.race([reader.read(), canceled]);
      if (done || !value) break;
      const retained = value.slice(0, TITLE_FETCH_MAX_BYTES - received);
      chunks.push(retained);
      received += retained.byteLength;
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = chunks.reduce((acc, chunk) => acc + decoder.decode(chunk, { stream: true }), '');
    return extractHtmlTitle(html);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', cancelWait);
    if (reader) {
      void reader.cancel().catch(() => {}).finally(() => {
        try { reader?.releaseLock(); } catch { /* 已结束的读取不影响下一次请求。 */ }
      });
    } else {
      void response?.body?.cancel().catch(() => {});
    }
  }
}

/**
 * 启动剪贴板 URL 监听器
 * @description 开始监控剪贴板变化，当检测到新 URL 时获取页面标题并通知渲染进程
 * @param options - 监听器配置选项，包含窗口获取函数和状态获取函数
 */
export function startClipboardUrlWatcher(options: ClipboardUrlWatcherOptions): void {
  if (!options.getEnabled() || clipboardPollTimer) return;
  requestVersion += 1;
  let reading = false;

  // 异步读取不能重叠；停止或重启后丢弃旧读取结果，避免通知已关闭的窗口。
  const poll = async (baseline = false): Promise<void> => {
    if (reading) return;
    reading = true;
    const readVersion = requestVersion;
    let current: string;
    try {
      current = await clipboard.readText();
    } catch (err) {
      console.error('[ClipboardUrlWatcher] read error:', err);
      return;
    } finally {
      reading = false;
    }
    if (readVersion !== requestVersion || !clipboardPollTimer || !options.getEnabled()) return;
    if (baseline) { lastClipboardText = current; return; }
    const win = options.getWindow();
    if (!win || win.isDestroyed() || current === lastClipboardText) return;
    lastClipboardText = current;
    titleRequest?.abort();
    titleRequest = null;
    const version = ++requestVersion;

    const urls = extractUrls(current, options.getDetectMode());
    const blacklist = options.getBlacklist();
    const filteredUrls = urls.filter((url) => !isUrlBlacklisted(url, blacklist));
    if (filteredUrls.length === 0) return;
    const request = new AbortController();
    titleRequest = request;
    try {
      const title = await fetchPageTitle(filteredUrls[0], request.signal);
      if (version !== requestVersion || !clipboardPollTimer || !options.getEnabled()) return;
      const currentWindow = options.getWindow();
      if (!currentWindow || currentWindow.isDestroyed()) return;
      currentWindow.webContents.send('clipboard:urls-detected', { title, urls: filteredUrls });
    } finally {
      if (titleRequest === request) titleRequest = null;
    }
  };

  clipboardPollTimer = setInterval(() => {
    if (!options.getEnabled()) { stopClipboardUrlWatcher(); return; }
    const win = options.getWindow();
    if (!win || win.isDestroyed()) return;
    // eslint-disable-next-line promise/prefer-await-to-then -- 定时器必须同步返回，异步轮询单独处理拒绝。
    poll().catch(console.error);
  }, 1000);
  // eslint-disable-next-line promise/prefer-await-to-then -- 启动接口同步返回，异步基准读取单独处理拒绝。
  poll(true).catch(console.error);
}

/**
 * 停止剪贴板 URL 监听器
 * @description 停止剪贴板监控定时器，清理监听状态
 */
export function stopClipboardUrlWatcher(): void {
  if (clipboardPollTimer) clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
  requestVersion += 1;
  titleRequest?.abort();
  titleRequest = null;
  lastClipboardText = '';
}
