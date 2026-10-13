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
 * @file notificationConstants.ts
 * @description 通知组件存储键与启动更新续行事件常量
 * @author 鸡哥
 */

/** URL 收藏列表存储键 */
export const URL_FAVORITES_STORE_KEY = 'url-favorites';

/** URL 收藏跳转焦点键 */
export const URL_FAVORITES_FOCUS_KEY = 'url-favorites-focus-url';

/** 更新源存储键 */
export const UPDATE_SOURCE_STORE_KEY = 'update-source';

/** 设置页打开 Tab 存储键 */
export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';

/** 天气提醒按钮显式继续启动更新检查，避免界面锁定阻止状态切换。 */
export const STARTUP_UPDATE_CONTINUE_EVENT = 'updater:startup-continue';
