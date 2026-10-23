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
 */

/**
 * @file agentWebSearchService.ts
 * @description 本地与自定义模型通过用户鉴权接口调用服务端 SearXNG，不直连私有实例。
 * @author 鸡哥
 */

import { randomUUID } from 'crypto';
import { app } from 'electron';
import type { AgentLocalToolResult } from '../types/agent/AgentLocalToolResult';

const API_BASE = process.env.NODE_ENV === 'development'
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';

/**
 * 通过后端搜索接口执行 web.search，登录凭据不会传给本地模型或自定义供应商。
 * @param token - eIsland 用户登录凭据。
 * @param argumentsValue - 模型提交的搜索词及数量。
 * @param signal - 会话取消信号。
 * @returns 与本地编排器兼容的工具结果。
 */
export default async function executeAgentWebSearch(
  token: string | undefined,
  argumentsValue: unknown,
  signal: AbortSignal,
): Promise<AgentLocalToolResult> {
  const startedAt = Date.now();
  const failure = (error: string): AgentLocalToolResult => ({ error, success: false, result: {}, durationMs: Date.now() - startedAt });
  if (!token?.trim()) return failure('Authentication required for web.search');
  const args = argumentsValue && typeof argumentsValue === 'object' && !Array.isArray(argumentsValue)
    ? argumentsValue as Record<string, unknown> : {};
  const query = (typeof args.query === 'string' ? args.query.trim() : '')
    || (typeof args.q === 'string' ? args.q.trim() : '');
  if (!query || query.length > 500) return failure('web.search query must contain 1 to 500 characters');
  const rawLimit = Number(args.limit ?? 5);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(10, Math.floor(rawLimit))) : 5;
  try {
    const response = await fetch(`${API_BASE}/v1/user/ai/agent/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
        'X-App-Name': 'eisland',
        'X-Client-Version': app.getVersion(),
        'X-Timestamp': String(Date.now()),
        'X-Nonce': randomUUID(),
      },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    });
    if (response.status === 401 || response.status === 403) return failure('web.search authentication failed; sign in again');
    if (response.status === 404) return failure('SearXNG search endpoint unavailable; deploy the updated server');
    const payload = await response.json() as { success?: boolean; data?: unknown; error?: string };
    if (!response.ok || payload.success !== true) {
      return failure(typeof payload.error === 'string' && payload.error ? payload.error : `web.search failed: HTTP ${response.status}`);
    }
    const data = payload.data as { provider?: unknown; results?: unknown } | null;
    if (!data || data.provider !== 'searxng' || !Array.isArray(data.results)) return failure('Invalid SearXNG search response');
    return { success: true, result: payload.data, error: '', durationMs: Date.now() - startedAt };
  } catch {
    return failure(signal.aborted ? 'web.search cancelled' : 'SearXNG search request failed or timed out');
  }
}
