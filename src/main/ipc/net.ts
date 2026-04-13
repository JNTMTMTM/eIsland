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
 * @file net.ts
 * @description 网络请求相关 IPC 处理模块
 * @description 代理渲染进程的网络请求，处理超时和日志记录
 * @author 鸡哥
 */

import { ipcMain, net } from 'electron';

type MainLogWriter = (level: 'info' | 'warn' | 'error', message: string) => void;

interface RegisterNetIpcHandlersOptions {
  writeMainLog: MainLogWriter;
}

/**
 * 注册网络请求相关 IPC 处理器
 * @description 注册网络请求代理的 IPC 事件处理器，支持自定义方法和超时
 * @param options - 配置选项，包含日志写入函数
 */
export function registerNetIpcHandlers(options: RegisterNetIpcHandlersOptions): void {
  ipcMain.handle('net:fetch', async (_event, url: string, requestOptions?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }) => {
    const method = requestOptions?.method || 'GET';
    const headers = requestOptions?.headers || {};
    const body = requestOptions?.body;
    const allowsBody = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
    const timeoutMs = typeof requestOptions?.timeoutMs === 'number' ? requestOptions.timeoutMs : 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    options.writeMainLog('info', `[Net] request ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);

    try {
      const fetchOptions: {
        method: string;
        headers: Record<string, string>;
        signal: AbortSignal;
        body?: string;
      } = {
        method,
        headers,
        signal: controller.signal,
      };
      if (allowsBody && typeof body === 'string') {
        fetchOptions.body = body;
      }
      const resp = await net.fetch(url, fetchOptions);
      const text = await resp.text();
      options.writeMainLog('info', `[Net] response ${JSON.stringify({ method, url, status: resp.status, ok: resp.ok, body: text })}`);
      return { ok: resp.ok, status: resp.status, body: text };
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        options.writeMainLog('warn', `[Net] timeout ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs })}`);
        return { ok: false, status: 408, body: 'timeout' };
      }
      console.error('[Net] fetch proxy error:', err);
      options.writeMainLog('error', `[Net] error ${JSON.stringify({ method, url, headers, body: body ?? '', timeoutMs, error: String(err) })}`);
      return { ok: false, status: 0, body: '' };
    } finally {
      clearTimeout(timeout);
    }
  });
}
