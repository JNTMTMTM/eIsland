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
 * @file countdownTypes.ts
 * @description 倒数日数据与计时规则。
 * @author 鸡哥
 */

export type EventType = 'countdown' | 'anniversary' | 'birthday' | 'holiday' | 'exam';
export type CountMode = 'down' | 'up';
export type ExpiryAction = 'continue' | 'archive';

/** 可选字段保证旧版数据仍按单次倒数规则展示。 */
export interface CountdownItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: EventType;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  mode?: CountMode;
  repeat?: 'none' | 'yearly';
  expiryAction?: ExpiryAction;
  includeToday?: boolean;
  pinned?: boolean;
  archived?: boolean;
}

export type CountdownDraft = Omit<CountdownItem, 'id'>;
