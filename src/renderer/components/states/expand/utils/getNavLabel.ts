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

import type { NavDotId } from '../types/expandTypes';

/** 获取导航点的 i18n 标签 */
export const getNavLabel = (
  tab: NavDotId,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string =>
  t(`expanded.nav.${tab}`, {
    defaultValue:
      tab === 'hover'
        ? '返回'
        : tab === 'overview'
          ? '总览'
          : tab === 'song'
            ? '歌曲'
            : tab === 'tools'
              ? '工具'
              : tab === 'translation'
                ? '翻译'
                : tab === 'performanceMonitor'
                  ? '性能监控'
                  : tab === 'agentUsage'
                    ? 'Agent用量'
                    : '最大展开',
  });
