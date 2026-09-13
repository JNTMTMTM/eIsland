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
 * @file alarmCardTypes.ts
 * @description 闹钟卡片组件类型定义。
 * @author 鸡哥
 */

import type { AlarmItem, Weekday } from './alarmTypes';

/** AlarmCard 组件 Props */
export interface AlarmCardProps {
  alarm: AlarmItem;
  isActive: boolean;
  weekdayLabel: (d: Weekday) => string;
  repeatSummary: (repeat: Weekday[]) => string;
  nextRingDesc: (alarm: AlarmItem) => string;
  onStartEdit: (alarm: AlarmItem) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onToggleOverview: (id: number) => void;
  overviewSelected: boolean;
  overviewSelectionFull: boolean;
}
