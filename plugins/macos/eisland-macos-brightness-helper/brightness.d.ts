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
 * @file brightness.d.ts
 * @description 同步亮度读写接口的类型声明。
 * @author 鸡哥
 */
import type { BrightnessInfo } from './types';
/**
 * 查询内置屏优先的硬件亮度。
 * @returns 当前百分比快照；无受支持屏幕时为 null。
 */
export function getBrightness(): BrightnessInfo | null;
/**
 * 设置亮度。
 * @param brightness - 有限百分比，四舍五入并限制在 0–100。
 * @returns 至少一个目标写入成功时为 true。
 */
export function setBrightness(brightness: number): boolean;
