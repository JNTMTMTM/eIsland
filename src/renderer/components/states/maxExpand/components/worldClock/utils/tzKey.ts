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
 * @file tzKey.ts
 * @description IANA 时区 ID → i18n 翻译键转换工具
 * @author 鸡哥
 */

/**
 * 将 IANA 时区 ID 转为 i18n 键后缀（/ → _）
 * @param tz - IANA 时区 ID，如 "Asia/Shanghai"
 * @returns i18n 翻译键，如 "maxExpand.worldClock.timezoneLabels.Asia_Shanghai"
 */
export function tzKey(tz: string): string {
  return `maxExpand.worldClock.timezoneLabels.${tz.replace(/\//g, '_')}`;
}
