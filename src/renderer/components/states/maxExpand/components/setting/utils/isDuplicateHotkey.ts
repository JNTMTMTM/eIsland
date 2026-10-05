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
 * @file isDuplicateHotkey.ts
 * @description 按现有快捷键绑定检测冲突，允许保留当前动作的组合
 * @author 鸡哥
 */

import type { HotkeyAction, HotkeyBinding } from '../config/hotkeyConfig';

/**
 * 排除当前动作后检查已注册的快捷键组合。
 * @param acc - 待注册的 accelerator 字符串
 * @param exclude - 当前正在录入的动作
 * @param pairs - 所有动作的现有快捷键绑定
 * @returns 是否与其他非空绑定重复
 */
export function isDuplicateHotkey(acc: string, exclude: HotkeyAction, pairs: readonly HotkeyBinding[]): boolean {
  return pairs.some((item) => item.key !== exclude && item.value && item.value === acc);
}
