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
 * @file toolsTypes.ts
 * @description Expanded 系统工具 Tab 的快捷启动数据与 hook 返回值类型。
 * @author 鸡哥
 */

import type { DragEvent, RefObject } from 'react';

/** 应用快捷方式 */
export interface AppShortcut {
  id: number;
  name: string;
  path: string;
  iconBase64: string | null;
}

/** useToolsTab hook 返回值类型 */
export interface UseToolsTabReturn {
  apps: AppShortcut[];
  dragOver: boolean;
  dropError: boolean;
  dropDuplicate: boolean;
  editingId: number | null;
  editName: string;
  editRef: RefObject<HTMLInputElement | null>;
  setEditName: (name: string) => void;
  setEditingId: (id: number | null) => void;
  handleDrop: (e: DragEvent) => Promise<void>;
  handleDragEnter: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  removeApp: (id: number) => void;
  startEdit: (app: AppShortcut) => void;
  confirmEdit: () => void;
  openApp: (path: string) => void;
}
