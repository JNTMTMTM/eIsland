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

function extractHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

/** 限制最大字节数防止大文件 OOM */
const TITLE_FETCH_MAX_BYTES = 8192;

async function fetchPageTitle(url: string, timeoutMs = 3000): Promise<string> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await net.fetch(parsed.href, {
      signal: controller.signal as never,
      headers: { 'User-Agent': 'Mozilla/5.0', Range: 'bytes=0-8191' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!resp.ok && resp.status !== 206) return '';

    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return '';

    const reader = resp.body?.getReader();
    if (!reader) return '';
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < TITLE_FETCH_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      received += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = chunks.reduce((acc, chunk) => acc + decoder.decode(chunk, { stream: true }), '');
    return extractHtmlTitle(html);
  } catch {
    return '';
  }
}

/**
 * 启动剪贴板 URL 监听器
 * @description 开始监控剪贴板变化，当检测到新 URL 时获取页面标题并通知渲染进程
 * @param options - 监听器配置选项，包含窗口获取函数和状态获取函数
 */
export function startClipboardUrlWatcher(options: ClipboardUrlWatcherOptions): void {
  if (!options.getEnabled() || clipboardPollTimer) return;
  lastClipboardText = clipboard.readText() || '';

  clipboardPollTimer = setInterval(() => {
    const win = options.getWindow();
    if (!win || win.isDestroyed()) return;
    const current = clipboard.readText() || '';
    if (current === lastClipboardText) return;
    lastClipboardText = current;

    const urls = extractUrls(current, options.getDetectMode());
    const blacklist = options.getBlacklist();
    const filteredUrls = urls.filter((url) => !isUrlBlacklisted(url, blacklist));
    if (filteredUrls.length > 0) {
      fetchPageTitle(filteredUrls[0]).then((title) => {
        const currentWindow = options.getWindow();
        if (!currentWindow || currentWindow.isDestroyed()) return;
        currentWindow.webContents.send('clipboard:urls-detected', { urls: filteredUrls, title });
      });
    }
  }, 1000);
}

/**
 * 停止剪贴板 URL 监听器
 * @description 停止剪贴板监控定时器，清理监听状态
 */
export function stopClipboardUrlWatcher(): void {
  if (!clipboardPollTimer) return;
  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
}
