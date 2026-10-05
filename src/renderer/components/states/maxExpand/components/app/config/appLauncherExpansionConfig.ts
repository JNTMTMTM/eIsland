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
 * @file appLauncherExpansionConfig.ts
 * @description 应用图标放大避让位移的分离求解参数。
 * @author 鸡哥
 */

/** 放大图标与相邻图标之间保留的最小间隙（像素） */
export const ICON_GAP = 6;

/** 分离求解的最大迭代次数 */
export const MAX_SEPARATION_PASSES = 120;

/** 位移收敛容差，小于该值视为已分离 */
export const SEPARATION_TOLERANCE = .0001;
