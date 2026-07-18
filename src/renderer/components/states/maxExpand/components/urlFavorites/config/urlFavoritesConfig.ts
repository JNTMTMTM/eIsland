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
 * @file urlFavoritesConfig.ts
 * @description URL 收藏模块常量定义：持久化键、焦点键等。
 * @author 鸡哥
 */

/** 持久化键（对应 userData/eIsland_store/url-favorites.json） */
export const STORE_KEY = 'url-favorites';

/** localStorage 焦点跳转键 */
export const FOCUS_KEY = 'url-favorites-focus-url';

/** localStorage 缓存键 */
export const LOCAL_STORAGE_KEY = 'eIsland_url_favorites';

/** 支持的导入导出格式 */
export const SUPPORTED_FORMATS = ['json', 'html'] as const;
