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
 * 启动时尝试恢复登录态：
 * - 从 localStorage 与持久化 store 恢复 token/资料；
 * - 有 token 时请求最新用户资料并刷新本地缓存；
 * - 网络失败或会话失败均不主动清空本地会话（由退出登录/注销显式清理）。
 */
export async function bootstrapAuthSession(): Promise<void> {
  const logoutMarker = await window.api?.storeRead?.(USER_ACCOUNT_LOGOUT_MARKER_KEY).catch(() => null);
  if (logoutMarker === true) {
    return;
  }

  let token = readLocalToken();

  if (!token) {
    const persistedToken = await window.api?.storeRead?.(USER_ACCOUNT_TOKEN_STORAGE_KEY).catch(() => null);
    if (typeof persistedToken === 'string' && persistedToken.length > 0) {
      token = persistedToken;
      writeLocalToken(persistedToken);
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
    if (persistedProfile && typeof persistedProfile === 'object') {
      writeLocalProfile(persistedProfile as UserAccountProfile);
    }
  }

  if (!token) return;

  const profileResult = await fetchUserProfile(token);
  if (profileResult.ok && profileResult.data) {
    writeLocalProfile(profileResult.data);
    return;
  }
  if (profileResult.code === 401 || profileResult.code === 4011) {
    writeLocalToken(null);
    writeLocalProfile(null);
  }
}
