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
 * @file appTransitionConfig.ts
 * @description 应用导航缩放过渡的时长与倍率参数。
 * @author 鸡哥
 */

/** 过渡动画基准时长（毫秒） */
export const TRANSITION_DURATION_MS = 280;

/** 动画事件失效时的兜底结算时长（毫秒） */
export const TRANSITION_FALLBACK_MS = TRANSITION_DURATION_MS + 100;

/** 过渡中被点选图标的放大倍率 */
export const TRANSITION_ICON_SCALE = 3.2;
