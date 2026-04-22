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
 * @file userAccountApi.wallpaper.ts
 * @description 壁纸市场相关接口（列表、详情、上传、编辑、删除、应用、评分、举报）。
 * @author 鸡哥
 */

import {
  buildUploadHeaders,
  parsePayload,
  request,
  USER_ACCOUNT_API_BASE,
} from './userAccountApi.client';
import type {
  UploadWallpaperOptions,
  UploadWallpaperPayload,
  UserAccountResult,
  WallpaperMarketItem,
  WallpaperMarketListData,
  WallpaperTagItem,
} from './userAccountApi.types';

/**
 * 统一壁纸市场列表返回结构。
 * @param data - 接口返回的列表数据。
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

/**
 * 查询壁纸市场列表。
 * @param token - 用户 token。
 * @param params - 查询参数。
 * @returns 壁纸列表结果。
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
 * 查询当前用户上传的壁纸列表。
 * @param token - 用户 token。
 * @param params - 查询参数。
 * @returns 壁纸列表结果。
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
 * 搜索壁纸标签。
 * @param token - 用户 token。
 * @param keyword - 标签关键词。
 * @param limit - 返回条数。
 * @returns 标签列表结果。
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
 * @param token - 用户 token。
 * @param id - 壁纸 ID。
 * @returns 壁纸详情结果。
 */
export function getUserWallpaperDetail(token: string, id: number): Promise<UserAccountResult<WallpaperMarketItem>> {
  return request<WallpaperMarketItem>(`/v1/user/wallpapers/detail?id=${encodeURIComponent(String(id))}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 上传壁纸。
 * @param token - 用户 token。
 * @param payload - 上传参数。
 * @param options - 上传选项。
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

  const headers = await buildUploadHeaders(token);
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
 * @param token - 用户 token。
 * @param payload - 修改参数。
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
 * @param token - 用户 token。
 * @param id - 壁纸 ID。
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
 * @param token - 用户 token。
 * @param id - 壁纸 ID。
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
 * @param token - 用户 token。
 * @param id - 壁纸 ID。
 * @param score - 分数（1-5）。
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
 * @param token - 用户 token。
 * @param payload - 举报参数。
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
