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
 * @file request.ts
 * @description 歌词网络请求封装 — JSON 请求 / 原始文本请求，带日志与超时
 * @author 鸡哥
 */

import { loadNetworkConfig } from '../../../store/utils/storage';
import { logger } from '../../../utils/logger';

export async function requestJsonWithLog<T>(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<T | null> {
  const { timeoutMs } = loadNetworkConfig();
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body ?? '';

  logger.info('[LrcApi] request', { method, url, headers, body, timeoutMs });
  const resp = await window.api.netFetch(url, { method, headers, body, timeoutMs });
  logger.info('[LrcApi] response', { method, url, status: resp.status, ok: resp.ok, bodyLen: resp.body?.length });
  if (!resp.ok) return null;

  try {
    return JSON.parse(resp.body) as T;
  } catch (error) {
    logger.error('[LrcApi] JSON 解析失败:', {
      method,
      url,
      error: String(error),
      bodyPreview: resp.body?.slice(0, 200),
    });
    return null;
  }
}

export async function requestTextWithLog(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<string | null> {
  const { timeoutMs } = loadNetworkConfig();
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body ?? '';

  logger.info('[LrcApi] request', { method, url, headers, body, timeoutMs });
  const resp = await window.api.netFetch(url, { method, headers, body, timeoutMs });
  logger.info('[LrcApi] response', { method, url, status: resp.status, ok: resp.ok, bodyLen: resp.body?.length });
  if (!resp.ok) return null;

  return resp.body ?? null;
}
