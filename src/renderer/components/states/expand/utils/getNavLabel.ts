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
 * @file getNavLabel.ts
 * @description 获取导航点的 i18n 标签工具函数
 * @author 鸡哥
 */

import { NAV_DOT_DEFAULT_LABELS } from '../config/expandConfig';
import type { NavDotId } from '../types/expandTypes';

/**
 * 获取导航点的 i18n 标签
 * @param tab - 导航点标识
 * @param t - 翻译函数
 * @returns 当前语言的标签，翻译缺失时使用中文默认文案
 */
export function getNavLabel(
  tab: NavDotId,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  return t(`expanded.nav.${tab}`, { defaultValue: NAV_DOT_DEFAULT_LABELS[tab] ?? NAV_DOT_DEFAULT_LABELS.maxExpand });
}
