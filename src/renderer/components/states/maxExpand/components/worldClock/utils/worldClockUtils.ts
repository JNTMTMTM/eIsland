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
 * @file worldClockUtils.ts
 * @description 世界时钟模块工具函数：持久化、数据规范化、时钟构建
 * @author 鸡哥
 */

import { getWorldClockTime, listSupportedTimezones } from '@multisystemsuite/timezone-engine-core';
import { getTimezoneInfo, listCities } from '@multisystemsuite/timezone-engine-world-data';
import type { WorldClockCity, WorldClockTick, TimezoneOption } from '../types/worldClockTypes';
import { STORE_KEY } from '../types/worldClockTypes';

/** 通过 IPC 写入文件 */
export function persistCities(cities: WorldClockCity[]): void {
  window.api.storeWrite(STORE_KEY, cities).catch(() => {});
}

/** 规范化旧数据 */
export function normalizeCities(data: unknown): WorldClockCity[] {
  if (!Array.isArray(data)) return [];
  return data.map((item: Record<string, unknown>, index: number) => ({
    timezone: typeof item.timezone === 'string' ? item.timezone : 'UTC',
    label: typeof item.label === 'string' ? item.label : item.timezone ?? 'UTC',
    order: typeof item.order === 'number' ? item.order : index,
  }));
}

/** 构建单条时钟 tick */
export function buildTick(city: WorldClockCity, now: Date, localTz: string): WorldClockTick {
  const entry = getWorldClockTime(city.timezone, city.label, now);
  return {
    timezone: entry.timezone,
    label: entry.label,
    formattedTime: entry.formattedTime,
    formattedDate: formatTickDate(now, entry.timezone),
    utcOffset: entry.utcOffset,
    isDST: entry.isDST,
    isLocal: entry.timezone === localTz,
  };
}

/** 构建所有时钟 ticks */
export function buildAllTicks(cities: WorldClockCity[], localTz: string): WorldClockTick[] {
  const now = new Date();
  return cities
    .sort((a, b) => a.order - b.order)
    .map((city) => buildTick(city, now, localTz));
}

/** 获取所有可选时区列表（带城市名称） */
export function getAllTimezoneOptions(): TimezoneOption[] {
  const supported = listSupportedTimezones();
  const cities = listCities();
  const cityMap = new Map<string, string>();
  for (const c of cities) {
    cityMap.set(c.timezone, c.city);
  }
  return supported.map((tz) => {
    const info = getTimezoneInfo(tz);
    const cityName = cityMap.get(tz);
    const label = cityName ?? info?.city ?? tz.replace(/_/g, ' ').split('/').pop() ?? tz;
    return { timezone: tz, label };
  });
}

/** 格式化 tick 日期（简短） */
function formatTickDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: 'numeric',
      day: 'numeric',
    }).format(now);
  } catch {
    return '';
  }
}
