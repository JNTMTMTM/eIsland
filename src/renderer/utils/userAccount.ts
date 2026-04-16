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
 * @file userAccount.ts
 * @description 用户账号本地会话工具：仅负责 token / 资料在 localStorage 的读写与类型定义，
 *              不包含任何网络请求（网络请求位于 `renderer/api/userAccountApi.ts`）。
 * @author 鸡哥
 */

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
 * 清空当前设备上的登录态（token + 资料缓存），用于登出 / 注销 / token 失效兜底。
 */
export function clearLocalAccount(): void {
  writeLocalToken(null);
  writeLocalProfile(null);
}
