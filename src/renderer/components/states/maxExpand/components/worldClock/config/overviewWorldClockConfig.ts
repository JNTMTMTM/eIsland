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
 * 判断时区是否可由当前运行时解析。
 * @param timezone - 候选 IANA 时区名称
 * @returns 可解析时返回 true
 */
function isSupportedTimezone(timezone: unknown): timezone is string {
  if (typeof timezone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * 标准化总览时区配置。
 * @param raw - 任意来源的原始配置
 * @returns 最多包含两个不同有效时区的配置
 */
export function normalizeOverviewWorldClockConfig(raw: unknown): OverviewWorldClockConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG;
  const candidate = raw as Partial<OverviewWorldClockConfig> & { firstTimezone?: unknown; secondTimezone?: unknown };
  const source = Array.isArray(candidate.timezones)
    ? candidate.timezones
    : [candidate.firstTimezone, candidate.secondTimezone];
  const timezones = source.filter(isSupportedTimezone).filter((timezone, index, values) => values.indexOf(timezone) === index).slice(0, 2);
  return { timezones };
}
