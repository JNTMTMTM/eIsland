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
 * @file overviewAlarmConfig.ts
 * @description 总览闹钟选择配置。
 * @author 鸡哥
 */

export const OVERVIEW_ALARM_STORE_KEY = 'overview-alarm-selection';
export const OVERVIEW_ALARM_LIMIT = 2;

/** 校验存档，保留最多两个不同的闹钟 ID。 */
export function normalizeOverviewAlarmIds(value: unknown): number[] {
  if (!value || typeof value !== 'object') return [];
  const ids = (value as { alarmIds?: unknown }).alarmIds;
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id >= 0))].slice(0, OVERVIEW_ALARM_LIMIT);
}
