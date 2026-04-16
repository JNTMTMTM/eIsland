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
 * @file userAccountApi.ts
 * @description 用户账号接口模块（对接 pyisland-admin /auth/user 与 /v1/user/*）
 * @author 鸡哥
 */

/** pyisland-admin 服务根地址 */
export const USER_ACCOUNT_API_BASE = 'https://server.pyisland.com/api';

/** 本地 token 存储键 */
export const USER_ACCOUNT_TOKEN_STORAGE_KEY = 'user-account-token';
/** 本地缓存账号资料键 */
export const USER_ACCOUNT_PROFILE_STORAGE_KEY = 'user-account-profile';

/** 账号性别枚举 */
export type UserAccountGender = 'male' | 'female' | 'custom' | 'undisclosed';

/** 账号资料 */
export interface UserAccountProfile {
  username: string;
  email: string;
  avatar: string | null;
  gender: UserAccountGender;
  genderCustom: string | null;
  birthday: string | null;
  createdAt: string;
}

/** 通用 API 返回值 */
export interface UserAccountResult<T = unknown> {
  ok: boolean;
  code: number;
  message: string;
  data?: T;
}

/** 登录结果数据 */
export interface UserAccountLoginData {
  token: string;
  username: string;
  email: string;
  role: string;
}

/** 超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

interface InternalRequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth?: string | null;
  body?: Record<string, unknown> | null;
  timeoutMs?: number;
}

function parsePayload<T>(body: string): UserAccountResult<T> {
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

async function request<T>(path: string, init: InternalRequestInit = {}): Promise<UserAccountResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (init.auth) {
    headers['Authorization'] = `Bearer ${init.auth}`;
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

/**
 * 获取本地保存的 token。
 * @returns 本地保存的 token，未登录时返回 null。
 */
export function readLocalToken(): string | null {
  try {
    const raw = localStorage.getItem(USER_ACCOUNT_TOKEN_STORAGE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

/**
 * 将 token 写入本地存储。
 * @param token 新 token；传入 null 表示清除登录态。
 */
export function writeLocalToken(token: string | null): void {
  try {
    if (token && token.length > 0) {
      localStorage.setItem(USER_ACCOUNT_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(USER_ACCOUNT_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * 获取本地缓存的账号资料。
 * @returns 最近一次拉取到的资料；无缓存时返回 null。
 */
export function readLocalProfile(): UserAccountProfile | null {
  try {
    const raw = localStorage.getItem(USER_ACCOUNT_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccountProfile;
  } catch {
    return null;
  }
}

/**
 * 将账号资料写入本地缓存。
 * @param profile 资料；传入 null 表示清除缓存。
 */
export function writeLocalProfile(profile: UserAccountProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(USER_ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(USER_ACCOUNT_PROFILE_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * 用户登录。
 * @param username 用户名。
 * @param password 密码。
 * @returns 登录结果。
 */
export function loginUser(username: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login', {
    method: 'POST',
    body: { username, password },
  });
}

/**
 * 用户注册。
 * @param username 用户名。
 * @param email 邮箱。
 * @param password 密码。
 * @returns 注册结果。
 */
export function registerUser(username: string, email: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/register', {
    method: 'POST',
    body: { username, email, password },
  });
}

/**
 * 获取当前登录用户资料。
 * @param token 用户 token。
 * @returns 资料结果。
 */
export function fetchUserProfile(token: string): Promise<UserAccountResult<UserAccountProfile>> {
  return request<UserAccountProfile>('/v1/user/profile', {
    method: 'GET',
    auth: token,
  });
}

/** 修改资料时可选提交的字段。留空的字段表示不修改。 */
export interface UpdateUserProfilePayload {
  password?: string;
  avatar?: string | null;
  gender?: UserAccountGender;
  genderCustom?: string | null;
  birthday?: string | null;
}

/**
 * 修改当前登录用户资料。
 * @param token 用户 token。
 * @param payload 待更新字段。
 * @returns 更新结果。
 */
export function updateUserProfile(token: string, payload: UpdateUserProfilePayload): Promise<UserAccountResult<unknown>> {
  const body: Record<string, unknown> = {};
  if (typeof payload.password === 'string' && payload.password.length > 0) body.password = payload.password;
  if (payload.avatar !== undefined) body.avatar = payload.avatar;
  if (payload.gender) body.gender = payload.gender;
  if (payload.genderCustom !== undefined) body.genderCustom = payload.genderCustom;
  if (payload.birthday !== undefined) body.birthday = payload.birthday;
  return request('/v1/user/profile', {
    method: 'PUT',
    auth: token,
    body,
  });
}

/**
 * 用户登出：清空服务端 session_token。
 * @param token 用户 token。
 * @returns 登出结果。
 */
export function logoutUser(token: string): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/logout', {
    method: 'POST',
    auth: token,
    body: {},
  });
}

/**
 * 注销账号：需带当前密码二次确认。
 * @param token 用户 token。
 * @param password 当前密码。
 * @returns 注销结果。
 */
export function unregisterUser(token: string, password: string): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/account', {
    method: 'DELETE',
    auth: token,
    body: { password },
  });
}

/**
 * 上传头像到 Cloudflare R2（经由后端公开头像接口）。
 * 由于需要发送 multipart/form-data，走浏览器原生 fetch；后端 CORS 允许所有来源。
 * @param file 头像文件。
 * @returns 上传后的完整 URL；失败时抛出 Error。
 */
export async function uploadUserAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch(`${USER_ACCOUNT_API_BASE}/v1/upload/user-avatar`, {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    throw new Error(`上传失败：HTTP ${resp.status}`);
  }
  const payload = await resp.json() as { code?: number; message?: string; data?: string };
  if (payload?.code !== 200 || typeof payload.data !== 'string' || payload.data.length === 0) {
    throw new Error(payload?.message || '上传失败');
  }
  return payload.data;
}
