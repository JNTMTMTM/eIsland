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
 * @file cliConstants.ts
 * @description CLI 面板常量配置
 * @author 鸡哥
 */

/** 每页显示的流事件数量 */
export const EVENTS_PER_PAGE = 3;

/** 每页显示的会话数量 */
export const SESSIONS_PER_PAGE = 6;

/** 流结束事件名 */
export const STOP_EVENTS = new Set(['Stop', 'StopFailure', 'SubagentStop', 'SessionEnd']);

/** 等待授权事件名 */
export const PERMISSION_EVENTS = new Set(['PermissionRequest', 'PermissionDenied']);
