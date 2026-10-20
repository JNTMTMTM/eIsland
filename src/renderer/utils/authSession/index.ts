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
 * @file index.ts
 * @description 用户会话恢复工具：启动时恢复本地 token/资料并尝试刷新资料。
 * @author 鸡哥
 */

import { fetchUserProfile } from '../../api/user/userAccountApi';
import {
  USER_ACCOUNT_LOGOUT_MARKER_KEY,
  USER_ACCOUNT_PROFILE_STORAGE_KEY,
  USER_ACCOUNT_TOKEN_STORAGE_KEY,
  type UserAccountProfile,
  readLocalToken,
  readLocalSessionRevision,
  writeLocalProfile,
  writeLocalToken,
} from '../userAccount';

/**
 * 在登录/注册成功后写入本地 token。
 */
export function updateSessionToken(token: string | null): void {
  writeLocalToken(token);
}

/**
 * 启动时仅从 localStorage 与持久化 store 恢复 token/资料，避免网络请求阻塞首屏。
 * @returns 恢复的 token；未登录或存在退出标记时返回 null，供挂载后后台刷新。
 */
export async function bootstrapAuthSession(): Promise<string | null> {
  const sessionRevision = readLocalSessionRevision();
  const logoutMarker = await window.api?.storeRead?.(USER_ACCOUNT_LOGOUT_MARKER_KEY).catch(() => null);
  if (readLocalSessionRevision() !== sessionRevision) return readLocalToken();
  if (logoutMarker === true) {
    return null;
  }

  let token = readLocalToken();

  if (!token) {
    const persistedToken = await window.api?.storeRead?.(USER_ACCOUNT_TOKEN_STORAGE_KEY).catch(() => null);
    if (typeof persistedToken === 'string' && persistedToken.length > 0) {
      const latestLogoutMarker = await window.api?.storeRead?.(USER_ACCOUNT_LOGOUT_MARKER_KEY).catch(() => null);
      if (readLocalSessionRevision() !== sessionRevision || readLocalToken() !== token) return readLocalToken();
      if (latestLogoutMarker === true) return null;
      token = persistedToken;
      // 恢复不能重写共享 store 或清除退出标记，避免反向覆盖其他窗口的退出操作。
      writeLocalToken(persistedToken, false);
      if (readLocalToken() !== token) return readLocalToken();
    }
  }

  let localProfileRaw: string | null = null;
  try {
    localProfileRaw = localStorage.getItem(USER_ACCOUNT_PROFILE_STORAGE_KEY);
  } catch {
    localProfileRaw = null;
  }
  if (!localProfileRaw) {
    const persistedProfile = await window.api?.storeRead?.(USER_ACCOUNT_PROFILE_STORAGE_KEY).catch(() => null);
    if (readLocalSessionRevision() !== sessionRevision || readLocalToken() !== token) return readLocalToken();
    if (persistedProfile && typeof persistedProfile === 'object') {
      writeLocalProfile(persistedProfile as UserAccountProfile);
    }
  }

  return token;
}

/**
 * 挂载后后台刷新资料；网络失败保留本地会话，明确失效时清理。
 * @param token - 启动时恢复的 token；null 时跳过请求。
 * @returns 刷新完成的 Promise，失败时保留缓存并记录日志。
 */
export async function refreshAuthSession(token: string | null): Promise<void> {
  if (!token || readLocalToken() !== token) return;
  try {
    const profileResult = await fetchUserProfile(token);
    // 用户可在请求期间退出或切换账号，旧响应不能覆盖新会话。
    if (readLocalToken() !== token) return;
    if (profileResult.ok && profileResult.data) {
      writeLocalProfile(profileResult.data);
      return;
    }
    if (profileResult.code === 401 || profileResult.code === 4011) {
      writeLocalToken(null);
      writeLocalProfile(null);
    }
  } catch (error) {
    console.warn('[Auth] Background profile refresh failed:', error);
  }
}
