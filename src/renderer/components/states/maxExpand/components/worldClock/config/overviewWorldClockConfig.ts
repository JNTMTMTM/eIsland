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
 * @file overviewWorldClockConfig.ts
 * @description 总览世界时钟的最多两个时区持久化配置
 * @author 鸡哥
 */

/** 总览世界时钟配置存储 key。 */
export const OVERVIEW_TIMEZONES_STORE_KEY = 'worldClockOverviewTimezones';

/** 总览世界时钟配置。 */
export interface OverviewWorldClockConfig {
  timezones: string[];
}

/** 默认不展示时区，用户从世界时钟卡片中选择。 */
export const DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG: OverviewWorldClockConfig = {
  timezones: [],
};

/**
 * 验证并解析时区为运行时规范名称。
 * @param timezone - 候选时区值
 * @returns 规范 IANA 名称；无效输入返回 null
 */
function canonicalizeTimezone(timezone: unknown): string | null {
  if (typeof timezone !== 'string') return null;
  try {
    return new Intl.DateTimeFormat('en', { timeZone: timezone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * 标准化总览时区配置。
 * @description 规范化别名（如 US/Eastern → America/New_York）后再去重，防止同一时区以不同别名占两个槽位。
 * @param raw - 任意来源的原始配置
 * @returns 最多包含两个不同有效时区的配置
 */
export function normalizeOverviewWorldClockConfig(raw: unknown): OverviewWorldClockConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG;
  const candidate = raw as Partial<OverviewWorldClockConfig> & { firstTimezone?: unknown; secondTimezone?: unknown };
  const source = Array.isArray(candidate.timezones)
    ? candidate.timezones
    : [candidate.firstTimezone, candidate.secondTimezone];
  const timezones = source
    .map(canonicalizeTimezone)
    .filter((tz): tz is string => tz !== null)
    .filter((tz, index, arr) => arr.indexOf(tz) === index)
    .slice(0, 2);
  return { timezones };
}
