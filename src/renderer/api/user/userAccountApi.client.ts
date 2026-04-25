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
 * @file userAccountApi.client.ts
 * @description 用户账号 API 的通用请求客户端与头部构造工具。
 * @author 鸡哥
 */

import { buildReplayHeaders as buildSecurityReplayHeaders } from '../../utils/security';
import type { UserAccountResult } from './userAccountApi.types';

const IS_DEV_RENDERER = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const USER_ACCOUNT_API_BASE = IS_DEV_RENDERER
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';

const DEFAULT_TIMEOUT_MS = 10000;
const APP_NAME_HEADER = 'X-App-Name';
const APP_NAME_VALUE = 'eisland';
const STATIC_ASSET_NODE_HEADER = 'X-Static-Asset-Node';
const NETWORK_CONFIG_KEY = 'island_network_config';
const CLIENT_VERSION_HEADER = 'X-Client-Version';
const REPLAY_TIMESTAMP_HEADER = 'X-Timestamp';
const REPLAY_NONCE_HEADER = 'X-Nonce';
const LOGIN_REPLAY_PATHS = new Set([
  '/auth/user/login',
  '/auth/user/login/account',
  '/auth/user/login/email',
  '/auth/user/token/refresh',
]);
let cachedClientVersion: string | null = null;

type StaticAssetNode = 'r2' | 'cos' | 'oss';

export interface InternalRequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth?: string | null;
  body?: Record<string, unknown> | null;
  timeoutMs?: number;
}

/**
 * 构建防重放请求头。
 * @returns 防重放请求头对象。
 */
export function buildReplayHeaders(): Record<string, string> {
  return buildSecurityReplayHeaders(REPLAY_TIMESTAMP_HEADER, REPLAY_NONCE_HEADER);
}

function parseRoleFromToken(auth?: string | null): string | null {
  if (!auth) return null;
  const rawToken = auth.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    if (typeof decoded.role !== 'string') return null;
    return decoded.role.trim().toLowerCase().replace(/^role_/, '');
  } catch {
    return null;
  }
}

function readStoredStaticAssetNode(): StaticAssetNode {
  try {
    const raw = localStorage.getItem(NETWORK_CONFIG_KEY);
    if (!raw) return 'r2';
    const data = JSON.parse(raw) as { staticAssetNode?: unknown };
    if (data.staticAssetNode === 'oss') return 'oss';
    if (data.staticAssetNode === 'cos') return 'cos';
  } catch {
    // ignore
  }
  return 'r2';
}

function resolveStaticAssetNodeHeaderValue(auth?: string | null): StaticAssetNode {
  const role = parseRoleFromToken(auth);
  const isProUser = role === 'pro' || role === 'admin';
  if (!isProUser) {
    return 'r2';
  }
  const stored = readStoredStaticAssetNode();
  if (stored === 'r2') {
    return 'r2';
  }
  if (stored === 'oss') {
    return 'oss';
  }
  if (stored === 'cos') {
    return 'cos';
  }
  return 'r2';
}

function shouldAttachReplayHeaders(path: string, method: InternalRequestInit['method'], auth?: string | null): boolean {
  const actualMethod = method ?? 'GET';
  if (actualMethod !== 'POST' && actualMethod !== 'PUT' && actualMethod !== 'DELETE') return false;
  if (LOGIN_REPLAY_PATHS.has(path)) return true;
  if (!auth || auth.trim().length === 0) return false;
  return path.startsWith('/v1/user/') || path === '/v1/upload/user-avatar';
}

/**
 * 解析并缓存客户端版本号。
 * @returns 客户端版本号；不可用时返回 null。
 */
export async function resolveClientVersion(): Promise<string | null> {
  if (cachedClientVersion && cachedClientVersion.length > 0) {
    return cachedClientVersion;
  }
  try {
    const version = await window.api.updaterVersion();
    const normalized = typeof version === 'string' ? version.trim() : '';
    if (!normalized) return null;
    cachedClientVersion = normalized;
    return normalized;
  } catch {
    return null;
  }
}

/**
 * 解析后端统一响应体。
 * @param body - 响应文本。
 * @returns 统一结果对象。
 */
export function parsePayload<T>(body: string): UserAccountResult<T> {
  try {
    const payload = JSON.parse(body) as { code?: number; message?: string; data?: T };
    const code = typeof payload?.code === 'number' ? payload.code : 0;
    const message = typeof payload?.message === 'string' && payload.message.length > 0
      ? payload.message
      : (code === 200 ? 'success' : 'failed');
    return { ok: code === 200, code, message, data: payload?.data };
  } catch {
    return { ok: false, code: -1, message: '响应解析失败' };
  }
}

/**
 * 构建上传接口所需请求头。
 * @param token - 用户 token。
 * @returns 上传请求头对象。
 */
export async function buildUploadHeaders(token?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    [APP_NAME_HEADER]: APP_NAME_VALUE,
  };
  const clientVersion = await resolveClientVersion();
  if (clientVersion) {
    headers[CLIENT_VERSION_HEADER] = clientVersion;
  }
  if (token && token.trim().length > 0) {
    headers.Authorization = `Bearer ${token}`;
    Object.assign(headers, buildReplayHeaders());
    headers[STATIC_ASSET_NODE_HEADER] = resolveStaticAssetNodeHeaderValue(token);
  }
  return headers;
}

/**
 * 执行用户账号 API 请求。
 * @param path - 接口路径。
 * @param init - 请求配置。
 * @returns 统一结果对象。
 */
export async function request<T>(path: string, init: InternalRequestInit = {}): Promise<UserAccountResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [APP_NAME_HEADER]: APP_NAME_VALUE,
  };
  const clientVersion = await resolveClientVersion();
  if (clientVersion) {
    headers[CLIENT_VERSION_HEADER] = clientVersion;
  }
  if (init.auth) {
    headers.Authorization = `Bearer ${init.auth}`;
    headers[STATIC_ASSET_NODE_HEADER] = resolveStaticAssetNodeHeaderValue(init.auth);
  }
  if (shouldAttachReplayHeaders(path, init.method, init.auth)) {
    Object.assign(headers, buildReplayHeaders());
  }
  try {
    const resp = await window.api.netFetch(`${USER_ACCOUNT_API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      timeoutMs: init.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    if (!resp) {
      return { ok: false, code: -1, message: '网络请求失败' };
    }
    const parsed = parsePayload<T>(resp.body);
    if (!resp.ok && parsed.code === 0) {
      return { ok: false, code: resp.status, message: `HTTP ${resp.status}` };
    }
    return parsed;
  } catch (err) {
    return { ok: false, code: -1, message: err instanceof Error ? err.message : '网络请求失败' };
  }
}
