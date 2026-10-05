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
 * @file keyEventToAccelerator.ts
 * @description 统一快捷键转换规则，保持录入和注册的 accelerator 格式一致
 * @author 鸡哥
 */

import type { KeyboardEvent } from 'react';
import { HOTKEY_KEY_MAP, IGNORED_HOTKEY_KEYS } from '../config/hotkeyConfig';

/**
 * 保留 Electron 注册所需的修饰键与按键映射规则。
 * @param e - React 键盘事件
 * @returns accelerator 字符串；单独按修饰键时返回空字符串
 */
export function keyEventToAccelerator(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Super');

  if (IGNORED_HOTKEY_KEYS.includes(e.key)) return '';

  const mapped = HOTKEY_KEY_MAP[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  parts.push(mapped);

  return parts.length >= 2 ? parts.join('+') : '';
}
