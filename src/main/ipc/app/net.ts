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

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
]);

const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'oldPassword',
  'newPassword',
  'confirmPassword',
]);

function isTrustedSenderUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('file://')
    || url.startsWith('http://localhost:')
    || url.startsWith('http://127.0.0.1:')
    || url.startsWith('https://localhost:')
    || url.startsWith('https://127.0.0.1:')
    || url.startsWith('app://');
}

function ensureHttpUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function redactHeadersForLog(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(headers).forEach(([name, value]) => {
    if (SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
      out[name] = '[REDACTED]';
      return;
    }
    out[name] = value;
  });
  return out;
}

function redactValueDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValueDeep(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (SENSITIVE_BODY_KEYS.has(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactValueDeep(val);
      }
    });
    return out;
  }
  return value;
}

function redactBodyForLog(body: string | undefined): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body) as unknown;
    return JSON.stringify(redactValueDeep(parsed));
  } catch {
    return `[REDACTED_NON_JSON_BODY length=${body.length}]`;
  }
}

function sanitizeHeaderName(name: string): string {
  return name.trim();
}

function sanitizeHeaderValue(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 255) {
      out += value[i];
    }
  }
  return out;
}

function sanitizeRequestHeaders(headers: Record<string, string>, writeMainLog: MainLogWriter): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  Object.entries(headers).forEach(([rawName, rawValue]) => {
    if (typeof rawName !== 'string') return;
    const name = sanitizeHeaderName(rawName);
    if (!name) return;
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      writeMainLog('warn', `[Net] drop invalid header name: ${rawName}`);
      return;
    }

    const value = sanitizeHeaderValue(String(rawValue ?? ''));
    if (value.length !== String(rawValue ?? '').length) {
      writeMainLog('warn', `[Net] sanitize non-ByteString header value for: ${name}`);
    }
    safeHeaders[name] = value;
  });
  return safeHeaders;
}

/**
 * 注册网络请求相关 IPC 处理器
 * @description 注册网络请求代理的 IPC 事件处理器，支持自定义方法和超时
 * @param options - 配置选项，包含日志写入函数
 */
export function registerNetIpcHandlers(options: RegisterNetIpcHandlersOptions): void {
  ipcMain.handle('net:fetch', async (event, url: string, requestOptions?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }) => {
    const senderUrl = event.senderFrame?.url ?? '';
    if (!isTrustedSenderUrl(senderUrl)) {
      options.writeMainLog('warn', `[Net] blocked request from untrusted sender: ${senderUrl || 'unknown'}`);
      return { ok: false, status: 403, body: '' };
    }

    const parsedUrl = ensureHttpUrl(url);
    if (!parsedUrl) {
      options.writeMainLog('warn', `[Net] blocked non-http(s) url: ${url}`);
      return { ok: false, status: 400, body: '' };
    }

    const method = requestOptions?.method || 'GET';
    const headers = sanitizeRequestHeaders(requestOptions?.headers || {}, options.writeMainLog);
    const body = requestOptions?.body;
    const allowsBody = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
    const timeoutMs = typeof requestOptions?.timeoutMs === 'number' ? requestOptions.timeoutMs : 10000;
    const safeLogUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    const safeLogHeaders = redactHeadersForLog(headers);
    const safeLogBody = redactBodyForLog(body);
    options.writeMainLog('info', `[Net] request ${JSON.stringify({ method, url: safeLogUrl, headers: safeLogHeaders, body: safeLogBody, timeoutMs })}`);

    try {
      const result = await new Promise<{ ok: boolean; status: number; body: string }>((resolve) => {
        let settled = false;
        const finish = (value: { ok: boolean; status: number; body: string }): void => {
          if (settled) return;
          settled = true;
          resolve(value);
        };

        const request = net.request({ method, url: parsedUrl.toString() });
        Object.entries(headers).forEach(([name, value]) => {
          try {
            request.setHeader(name, value);
          } catch (error) {
            options.writeMainLog('warn', `[Net] drop header on setHeader failure: ${name}, error=${String(error)}`);
          }
        });

        const timeout = setTimeout(() => {
          options.writeMainLog('warn', `[Net] timeout ${JSON.stringify({ method, url: safeLogUrl, headers: safeLogHeaders, body: safeLogBody, timeoutMs })}`);
          try {
            request.abort();
          } catch {}
          finish({ ok: false, status: 408, body: 'timeout' });
        }, timeoutMs);

        request.on('response', (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          response.on('end', () => {
            clearTimeout(timeout);
            const text = Buffer.concat(chunks).toString('utf-8');
            const status = response.statusCode ?? 0;
            finish({ ok: status >= 200 && status < 300, status, body: text });
          });
          response.on('error', (error) => {
            clearTimeout(timeout);
            options.writeMainLog('error', `[Net] response stream error ${JSON.stringify({ method, url: safeLogUrl, error: String(error) })}`);
            finish({ ok: false, status: 0, body: '' });
          });
        });

        request.on('error', (error) => {
          clearTimeout(timeout);
          options.writeMainLog('error', `[Net] request error ${JSON.stringify({ method, url: safeLogUrl, error: String(error) })}`);
          finish({ ok: false, status: 0, body: '' });
        });

        if (allowsBody && typeof body === 'string') {
          request.write(body);
        }
        request.end();
      });

      options.writeMainLog('info', `[Net] response ${JSON.stringify({ method, url: safeLogUrl, status: result.status, ok: result.ok, bodyLen: result.body?.length ?? 0 })}`);
      return result;
    } catch (err) {
      console.error('[Net] fetch proxy error:', err);
      options.writeMainLog('error', `[Net] error ${JSON.stringify({ method, url: safeLogUrl, headers: safeLogHeaders, body: safeLogBody, timeoutMs, error: String(err) })}`);
      return { ok: false, status: 0, body: '' };
    }
  });
}
