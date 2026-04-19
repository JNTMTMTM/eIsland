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
 * @description 用户账号网络接口（对接 pyisland-admin /auth/user 与 /v1/user/*）。
 *              本文件只负责 HTTP 请求；本地会话与 localStorage 管理见
 *              `renderer/utils/userAccount.ts`。
 * @author 鸡哥
 */

import type {
  UserAccountGender,
  UserAccountProfile,
} from '../utils/userAccount';

export type { UserAccountGender, UserAccountProfile } from '../utils/userAccount';

/** pyisland-admin 服务根地址 */
export const USER_ACCOUNT_API_BASE = 'https://server.pyisland.com/api';

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

export type UserEmailCodeScene = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' | 'CHANGE_EMAIL';

export interface WallpaperMarketItem {
  id: number;
  ownerUsername: string;
  ownerAvatar?: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  status: string;
  originalUrl?: string;
  thumb320Url?: string;
  thumb720Url?: string;
  thumb1280Url?: string;
  durationMs?: number;
  frameRate?: number;
  tagsText?: string;
  copyrightInfo?: string;
  ratingAvg?: number;
  ratingCount?: number;
  downloadCount?: number;
  applyCount?: number;
  createdAt?: string;
  publishedAt?: string;
}

export interface WallpaperMarketListData {
  items: WallpaperMarketItem[];
  total?: number;
}

/**
 * 统一壁纸市场列表返回结构。
 * @param data 接口返回的列表数据（可能是旧数组格式或新对象格式）。
 * @returns 规范化后的列表项与总数。
 */
export function normalizeWallpaperMarketListData(
  data: WallpaperMarketListData | WallpaperMarketItem[] | undefined,
): { items: WallpaperMarketItem[]; total: number | null } {
  if (Array.isArray(data)) {
    return { items: data, total: null };
  }
  if (data && Array.isArray(data.items)) {
    return {
      items: data.items,
      total: typeof data.total === 'number' && Number.isFinite(data.total) && data.total >= 0
        ? data.total
        : null,
    };
  }
  return { items: [], total: null };
}

export interface UploadWallpaperPayload {
  title: string;
  description?: string;
  tags?: string;
  type?: 'image' | 'video';
  copyrightDeclared: boolean;
  copyrightInfo?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  frameRate?: number;
  original: File;
  thumb320: File;
  thumb720: File;
  thumb1280: File;
}

export interface UploadWallpaperOptions {
  onUploadProgress?: (percent: number) => void;
}

export interface WallpaperTagItem {
  id: number;
  name: string;
  slug: string;
  usageCount?: number;
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
 * 用户账户登录（用户名）。
 * @param username 用户名。
 * @param password 密码。
 * @returns 登录结果。
 */
export function loginUserByAccount(username: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/account', {
    method: 'POST',
    body: { username, password },
  });
}

/**
 * 用户邮箱登录。
 * @param email 邮箱。
 * @param password 密码。
 * @returns 登录结果。
 */
export function loginUserByEmail(email: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/email', {
    method: 'POST',
    body: { email, password, emailCode: '' },
  });
}

/**
 * 用户邮箱登录（带验证码）。
 * @param email 邮箱。
 * @param password 密码。
 * @param emailCode 邮箱验证码。
 * @returns 登录结果。
 */
export function loginUserByEmailWithCode(
  email: string,
  password: string,
  emailCode: string,
): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/email', {
    method: 'POST',
    body: { email, password, emailCode },
  });
}

/**
 * 用户登录兼容入口（根据账号形态自动选择账户登录或邮箱登录）。
 * @param account 登录账号（用户名或邮箱）。
 * @param password 密码。
 * @returns 登录结果。
 */
export function loginUser(account: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return account.includes('@')
    ? loginUserByEmailWithCode(account, password, '')
    : loginUserByAccount(account, password);
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
    body: { username, email, password, emailCode: '' },
  });
}

/**
 * 用户注册（带验证码）。
 * @param username 用户名。
 * @param email 邮箱。
 * @param password 密码。
 * @param emailCode 邮箱验证码。
 * @returns 注册结果。
 */
export function registerUserWithCode(
  username: string,
  email: string,
  password: string,
  emailCode: string,
): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/register', {
    method: 'POST',
    body: { username, email, password, emailCode },
  });
}

/**
 * 发送邮箱验证码。
 * @param email 邮箱。
 * @param scene 验证码使用场景。
 * @returns 发送结果（可能包含重试等待秒数）。
 */
export function sendUserEmailCode(
  email: string,
  scene: UserEmailCodeScene,
): Promise<UserAccountResult<{ retryAfterSeconds?: number }>> {
  return request<{ retryAfterSeconds?: number }>('/auth/user/email-code/send', {
    method: 'POST',
    body: { email, scene },
  });
}

/**
 * 校验邮箱验证码。
 * @param email 邮箱。
 * @param scene 验证码使用场景。
 * @param code 邮箱验证码。
 * @param consume 是否消费验证码（默认 true）。
 * @returns 校验结果。
 */
export function verifyUserEmailCode(
  email: string,
  scene: UserEmailCodeScene,
  code: string,
  consume = true,
): Promise<UserAccountResult<unknown>> {
  return request('/auth/user/email-code/verify', {
    method: 'POST',
    body: { email, scene, code, consume },
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

/**
 * 查询壁纸市场列表。
 * @param token 用户 token。
 * @param params 查询参数。
 * @returns 壁纸列表。
 */
export function listUserWallpapers(
  token: string,
  params: { keyword?: string; type?: 'image' | 'video'; sort?: 'newest' | 'rating' | 'apply'; page?: number; pageSize?: number } = {},
): Promise<UserAccountResult<WallpaperMarketListData | WallpaperMarketItem[]>> {
  const search = new URLSearchParams();
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.type) search.set('type', params.type);
  if (params.sort) search.set('sort', params.sort);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const suffix = search.toString();
  return request<WallpaperMarketListData | WallpaperMarketItem[]>(`/v1/user/wallpapers/list${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 查询当前用户上传的壁纸列表（包含 pending/rejected 等所有状态）。
 * @param token 用户 token。
 * @param params 查询参数。
 * @returns 壁纸列表。
 */
export function listMyUserWallpapers(
  token: string,
  params: { keyword?: string; type?: 'image' | 'video'; sort?: 'newest' | 'rating' | 'apply'; page?: number; pageSize?: number } = {},
): Promise<UserAccountResult<WallpaperMarketListData | WallpaperMarketItem[]>> {
  const search = new URLSearchParams();
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.type) search.set('type', params.type);
  if (params.sort) search.set('sort', params.sort);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const suffix = search.toString();
  return request<WallpaperMarketListData | WallpaperMarketItem[]>(`/v1/user/wallpapers/mine${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 搜索壁纸标签（用于自动补全）。
 * @param token 用户 token。
 * @param keyword 关键词；空字符串返回热门标签。
 * @param limit 返回条数。
 * @returns 标签列表。
 */
export function searchUserTags(
  token: string,
  keyword: string,
  limit: number = 15,
): Promise<UserAccountResult<WallpaperTagItem[]>> {
  const search = new URLSearchParams();
  if (keyword) search.set('keyword', keyword);
  search.set('limit', String(limit));
  return request<WallpaperTagItem[]>(`/v1/user/tags/search?${search.toString()}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 查询壁纸详情。
 * @param token 用户 token。
 * @param id 壁纸 ID。
 * @returns 壁纸详情。
 */
export function getUserWallpaperDetail(token: string, id: number): Promise<UserAccountResult<WallpaperMarketItem>> {
  return request<WallpaperMarketItem>(`/v1/user/wallpapers/detail?id=${encodeURIComponent(String(id))}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 上传壁纸。
 * @param token 用户 token。
 * @param payload 上传参数。
 * @returns 上传结果。
 */
export async function uploadUserWallpaper(
  token: string,
  payload: UploadWallpaperPayload,
  options: UploadWallpaperOptions = {},
): Promise<UserAccountResult<{ id: number }>> {
  const formData = new FormData();
  formData.append('title', payload.title);
  if (payload.description) formData.append('description', payload.description);
  if (payload.tags) formData.append('tags', payload.tags);
  formData.append('type', payload.type ?? 'image');
  formData.append('copyrightDeclared', payload.copyrightDeclared ? 'true' : 'false');
  if (payload.copyrightInfo) formData.append('copyrightInfo', payload.copyrightInfo);
  if (typeof payload.width === 'number' && Number.isFinite(payload.width)) formData.append('width', String(Math.round(payload.width)));
  if (typeof payload.height === 'number' && Number.isFinite(payload.height)) formData.append('height', String(Math.round(payload.height)));
  if (typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs) && payload.durationMs > 0) {
    formData.append('durationMs', String(Math.round(payload.durationMs)));
  }
  if (typeof payload.frameRate === 'number' && Number.isFinite(payload.frameRate) && payload.frameRate > 0) {
    formData.append('frameRate', String(payload.frameRate));
  }
  formData.append('original', payload.original);
  formData.append('thumb320', payload.thumb320);
  formData.append('thumb720', payload.thumb720);
  formData.append('thumb1280', payload.thumb1280);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${USER_ACCOUNT_API_BASE}/v1/user/wallpapers/upload`, true);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!options.onUploadProgress || !event.lengthComputable) {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      options.onUploadProgress(percent);
    };

    xhr.onerror = () => {
      resolve({ ok: false, code: -1, message: '网络请求失败' });
    };
    xhr.onabort = () => {
      resolve({ ok: false, code: -1, message: '网络请求失败' });
    };
    xhr.onload = () => {
      const bodyText = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      const parsed = parsePayload<{ id: number }>(bodyText);
      if ((xhr.status < 200 || xhr.status >= 300) && parsed.code === 0) {
        resolve({ ok: false, code: xhr.status, message: `HTTP ${xhr.status}` });
        return;
      }
      resolve(parsed);
    };

    xhr.send(formData);
  });
}

/**
 * 修改壁纸元数据。
 * @param token 用户 token。
 * @param payload 修改参数。
 * @returns 修改结果。
 */
export function updateUserWallpaperMetadata(
  token: string,
  payload: { id: number; title: string; description?: string; type?: 'image' | 'video'; tags?: string; copyrightInfo?: string },
): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/wallpapers/metadata', {
    method: 'PUT',
    auth: token,
    body: {
      id: payload.id,
      title: payload.title,
      description: payload.description ?? '',
      type: payload.type ?? 'image',
      tags: payload.tags ?? '',
      copyrightInfo: payload.copyrightInfo ?? '',
    },
  });
}

/**
 * 删除用户壁纸。
 * @param token 用户 token。
 * @param id 壁纸 ID。
 * @returns 删除结果。
 */
export function deleteUserWallpaper(token: string, id: number): Promise<UserAccountResult<unknown>> {
  return request(`/v1/user/wallpapers/delete?id=${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    auth: token,
  });
}

/**
 * 应用壁纸并计数。
 * @param token 用户 token。
 * @param id 壁纸 ID。
 * @returns 应用结果。
 */
export function applyUserWallpaper(token: string, id: number): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/wallpapers/apply', {
    method: 'POST',
    auth: token,
    body: { id },
  });
}

/**
 * 评分壁纸。
 * @param token 用户 token。
 * @param id 壁纸 ID。
 * @param score 分数（1-5）。
 * @returns 评分结果。
 */
export function rateUserWallpaper(token: string, id: number, score: number): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/wallpapers/rate', {
    method: 'POST',
    auth: token,
    body: { id, score },
  });
}

/**
 * 举报壁纸。
 * @param token 用户 token。
 * @param payload 举报参数。
 * @returns 举报结果。
 */
export function reportUserWallpaper(
  token: string,
  payload: { id: number; reasonType: string; reasonDetail?: string },
): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/wallpapers/report', {
    method: 'POST',
    auth: token,
    body: {
      id: payload.id,
      reasonType: payload.reasonType,
      reasonDetail: payload.reasonDetail ?? '',
    },
  });
}
