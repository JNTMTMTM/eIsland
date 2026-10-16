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
 * @file trayUserSummary.ts
 * @description 从本地账号缓存生成托盘用户卡片摘要，Pro 判定与用户中心一致
 * @author 鸡哥
 */

import { getRoleFromToken, readLocalProfile, readLocalToken } from '../../../../utils/userAccount';
import type { TrayUserSummary } from '../types';

/**
 * 将 ISO 时间格式化为 YYYY-MM-DD
 * @param value - ISO 时间字符串
 * @returns 格式化后的日期，无法解析时返回 null
 */
export function formatTrayDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 读取当前登录用户的托盘摘要
 * @description 托盘菜单与主窗口同源共享 localStorage，每次打开菜单时重新读取以反映最新登录态
 * @returns 用户摘要；未登录时 loggedIn 为 false
 */
export function readTrayUserSummary(): TrayUserSummary {
  const token = readLocalToken();
  const profile = readLocalProfile();
  if (!token || !profile) {
    return { loggedIn: false, name: '', avatar: null, email: '', isPro: false, proExpireDate: null };
  }
  const profileRole = (profile as { role?: unknown }).role;
  const normalizedProfileRole = typeof profileRole === 'string'
    ? profileRole.trim().toLowerCase().replace(/^role_/, '')
    : null;
  return {
    loggedIn: true,
    name: profile.username,
    avatar: profile.avatar || null,
    email: profile.email,
    isPro: normalizedProfileRole === 'pro' || getRoleFromToken(token) === 'pro',
    proExpireDate: formatTrayDate(profile.proExpireAt),
  };
}
