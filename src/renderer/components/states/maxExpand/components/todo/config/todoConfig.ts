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
 * @file todoConfig.ts
 * @description Todo 模块常量定义：优先级、大小、持久化键等。
 * @author 鸡哥
 */

import type { Priority, Size } from '../types/todoTypes';

/** 持久化键（对应 userData/eIsland_store/todos.json） */
export const STORE_KEY = 'todos';

/** localStorage 缓存键 */
export const LOCAL_STORAGE_KEY = 'eIsland_todos';
/** 同一窗口内同步待办更新，跨窗口继续使用现有 IPC 广播。 */
export const TODOS_UPDATED_EVENT = 'eisland:todos-updated';

/** 优先级配置 */
export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'P0', label: 'P0', color: '#ff5252' },
  { value: 'P1', label: 'P1', color: '#ffab40' },
  { value: 'P2', label: 'P2', color: '#69c0ff' },
];

/** 大小配置 */
export const SIZES: { value: Size; label: string; color: string }[] = [
  { value: 'S', label: 'S', color: '#81c784' },
  { value: 'M', label: 'M', color: '#64b5f6' },
  { value: 'L', label: 'L', color: '#ffb74d' },
  { value: 'XL', label: 'XL', color: '#e57373' },
];
