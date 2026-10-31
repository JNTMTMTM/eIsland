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
 * @file overviewTypes.ts
 * @description Expanded 总览 Tab 的布局配置、时钟样式与 hook 返回值类型。
 * @author 鸡哥
 */

import type { DragEvent, RefObject } from 'react';
import type { AppShortcut, TodoItem } from '../utils/types';

/** 总览控件类型 */
export type OverviewWidgetType = 'shortcuts' | 'todo' | 'song' | 'countdown' | 'pomodoro' | 'urlFavorites' | 'album' | 'mokugyo' | 'breakReminder' | 'worldClock' | 'alarm' | 'performanceMonitor' | 'agentQuota';

/** 中间时钟样式类型 */
export type OverviewClockStyle = 'classic' | 'gradient' | 'minimal';

export interface OverviewGradientColors {
  start: string;
  middle: string;
  end: string;
}

/** 总览布局配置 */
export interface OverviewLayoutConfig {
  left: OverviewWidgetType;
  right: OverviewWidgetType;
  clockStyle: OverviewClockStyle;
  gradientColors: OverviewGradientColors;
}

/** 中间时钟各字段，均已补零 */
export interface OverviewClockParts {
  hh: string;
  mm: string;
  ss: string;
  yyyy: number;
  month: string;
  day: string;
}

/** useOverviewTab hook 返回值类型 */
export interface UseOverviewTabReturn {
  now: Date;
  todos: TodoItem[];
  expandedId: number | null;
  apps: AppShortcut[];
  layoutConfig: OverviewLayoutConfig;
  dragIndexRef: RefObject<number | null>;
  dragOverIndex: number | null;
  openTargetPage: (target: string) => void;
  openWorldClockPage: () => void;
  openApp: (path: string) => void;
  handleAppDragStart: (e: DragEvent, index: number) => void;
  handleAppDragOver: (e: DragEvent, index: number) => void;
  handleAppDrop: (e: DragEvent, dropIndex: number) => void;
  handleAppDragEnd: () => void;
  toggleExpand: (id: number) => void;
  toggleDone: (id: number) => void;
  toggleSubDone: (todoId: number, subId: number) => void;
  removeTodo: (id: number) => void;
}
