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
 * @file musicWhitelist.ts
 * @description 统一引导与设置中的 YouTube Music Chrome PWA 白名单标识。
 * @author 鸡哥
 */

export const YOUTUBE_MUSIC_PWA_SOURCE_ID = 'Chrome._crx_cinhimbnkkghhklpknlkffjgod';
const LEGACY_YOUTUBE_MUSIC_PWA_SOURCE_ID = '_crx_cinhimbnkkghhklpknlkffjgod';

/**
 * 将旧 PWA 后缀和完整来源标识统一为 Chrome 的完整 ID。
 * @param value - 白名单条目或检测到的来源标识。
 * @returns 规范化的 PWA 标识，其他来源保持原值。
 */
export function canonicalizeMusicWhitelistEntry(value: string): string {
  const lower = value.toLowerCase();
  return lower === LEGACY_YOUTUBE_MUSIC_PWA_SOURCE_ID || lower === YOUTUBE_MUSIC_PWA_SOURCE_ID.toLowerCase()
    ? YOUTUBE_MUSIC_PWA_SOURCE_ID
    : value;
}

/**
 * 合并 PWA 的旧后缀与完整 ID，保留白名单顺序。
 * @param list - 存储或编辑中的白名单。
 * @returns 使用规范 ID 且不含重复条目的白名单。
 */
export function normalizeMusicWhitelist(list: string[]): string[] {
  return [...new Set(list.map(canonicalizeMusicWhitelistEntry))];
}
