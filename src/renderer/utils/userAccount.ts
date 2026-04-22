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
 *              不包含任何网络请求（网络请求位于 `renderer/api/user/userAccountApi.ts`）。
 * @author 鸡哥
 */

/** 本地 token 存储键 */
export const USER_ACCOUNT_TOKEN_STORAGE_KEY = 'user-account-token';
/** 本地缓存账号资料键 */
export const USER_ACCOUNT_PROFILE_STORAGE_KEY = 'user-account-profile';
/** 显式退出登录标记（用于阻止启动时从持久化 store 恢复旧 token） */
export const USER_ACCOUNT_LOGOUT_MARKER_KEY = 'user-account-logout-marker';
/** 登录态变更事件 */
export const USER_ACCOUNT_SESSION_CHANGED_EVENT = 'user-account-session-changed';

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
 * 触发登录态变更事件，通知页面中依赖会话状态的组件刷新。
 */
export function emitUserAccountSessionChanged(): void {
  try {
    window.dispatchEvent(new Event(USER_ACCOUNT_SESSION_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * 订阅登录态变更事件。
 * @param listener 登录态变化时执行的回调。
 * @returns 取消订阅函数。
 */
export function subscribeUserAccountSessionChanged(listener: () => void): () => void {
  window.addEventListener(USER_ACCOUNT_SESSION_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(USER_ACCOUNT_SESSION_CHANGED_EVENT, listener);
  };
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
  if (token && token.length > 0) {
    window.api?.storeWrite?.(USER_ACCOUNT_TOKEN_STORAGE_KEY, token).catch(() => {});
    window.api?.storeWrite?.(USER_ACCOUNT_LOGOUT_MARKER_KEY, false).catch(() => {});
  } else {
    window.api?.storeWrite?.(USER_ACCOUNT_TOKEN_STORAGE_KEY, '').catch(() => {});
    window.api?.storeWrite?.(USER_ACCOUNT_LOGOUT_MARKER_KEY, true).catch(() => {});
  }
  emitUserAccountSessionChanged();
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
  if (profile) {
    window.api?.storeWrite?.(USER_ACCOUNT_PROFILE_STORAGE_KEY, profile).catch(() => {});
  } else {
    window.api?.storeWrite?.(USER_ACCOUNT_PROFILE_STORAGE_KEY, '').catch(() => {});
  }
  emitUserAccountSessionChanged();
}

/**
 * 清空当前设备上的登录态（token + 资料缓存），用于显式退出登录 / 注销。
 */
export function clearLocalAccount(): void {
  writeLocalToken(null);
  writeLocalProfile(null);
}
