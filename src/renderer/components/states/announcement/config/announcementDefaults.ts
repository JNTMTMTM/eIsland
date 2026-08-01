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
 * @file announcementDefaults.ts
 * @description 公告组件翻译键与默认值常量
 * @author 鸡哥
 */

/** 公告面板 i18n 翻译键 */
export const ANNOUNCEMENT_KEYS = {
  SUBTITLE: 'announcement.subtitle',
  DEFAULT_TITLE: 'announcement.defaultTitle',
  UPDATED_AT: 'announcement.updatedAt',
  LOADING: 'announcement.loading',
  EMPTY: 'announcement.empty',
} as const;

/** 公告面板翻译默认值 */
export const ANNOUNCEMENT_DEFAULTS = {
  SUBTITLE: '当前已是最新版本，以下为最新公告内容。',
  DEFAULT_TITLE: '系统公告',
  UPDATED_AT: '更新时间：{{time}}',
  LOADING: '正在加载公告…',
  EMPTY: '暂无公告内容',
} as const;
