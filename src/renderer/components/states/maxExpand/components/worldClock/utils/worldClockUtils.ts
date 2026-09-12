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
import type { TFunction } from 'i18next';
import type { WorldClockCity, WorldClockTick, TimezoneOption } from '../types/worldClockTypes';
import { STORE_KEY } from '../types/worldClockTypes';
import { TIMEZONE_LABELS } from '../config/timezoneLabels';
import { COMMON_CITY_OPTIONS } from '../config/commonCities';
import { TIMEZONE_COUNTRY_CODES } from '../config/timezoneCountryCodes';

/** 时区别名与日期格式器不随每秒 tick 改变，跨渲染复用。 */
const canonicalTimezoneCache = new Map<string, string>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** 通过 IPC 写入文件 */
export function persistCities(cities: WorldClockCity[]): void {
  window.api.storeWrite(STORE_KEY, cities).catch(() => {});
}

/** 规范化旧数据 */
export function normalizeCities(data: unknown): WorldClockCity[] {
  if (!Array.isArray(data)) return [];
  return data.map((item: Record<string, unknown>, index: number) => ({
    timezone: typeof item.timezone === 'string' ? item.timezone : 'UTC',
    label: typeof item.label === 'string' ? item.label : typeof item.timezone === 'string' ? item.timezone : 'UTC',
    labelKey: typeof item.labelKey === 'string' ? item.labelKey : undefined,
    order: typeof item.order === 'number' ? item.order : index,
  }));
}

/** 构建单条时钟 tick */
export function buildTick(city: WorldClockCity, now: Date, localTz: string, locale?: string): WorldClockTick {
  const entry = getWorldClockTime(city.timezone, city.label, now);
  return {
    timezone: entry.timezone,
    label: entry.label,
    labelKey: city.labelKey,
    countryCode: getTimezoneCountryCode(entry.timezone),
    formattedTime: entry.formattedTime,
    formattedDate: formatTickDate(now, entry.timezone, locale),
    handAngles: getClockHandAngles(now, entry.utcOffset),
    utcOffset: entry.utcOffset,
    isDST: entry.isDST,
    isLocal: getCanonicalTimezone(entry.timezone) === getCanonicalTimezone(localTz),
  };
}

/**
 * 复用时钟库已计算的实时偏移，避免为表盘重复执行时区格式化。
 * @param now - 与文字时钟相同的时间快照
 * @param utcOffset - 时钟库提供的带符号 HH:mm 偏移，已包含夏令时
 * @returns 从十二点方向顺时针旋转的三根指针角度
 */
function getClockHandAngles(now: Date, utcOffset: string): WorldClockTick['handAngles'] {
  const [hours, minutes] = utcOffset.slice(1).split(':').map(Number);
  const offsetMinutes = (hours * 60 + minutes) * (utcOffset.startsWith('-') ? -1 : 1);
  const localTime = new Date(now.getTime() + offsetMinutes * 60_000);
  const second = localTime.getUTCSeconds();
  const minute = localTime.getUTCMinutes() + second / 60;
  const hour = localTime.getUTCHours() % 12 + minute / 60;
  return { hour: hour * 30, minute: minute * 6, second: second * 6 };
}

/** 构建所有时钟 ticks */
export function buildAllTicks(cities: WorldClockCity[], localTz: string, locale?: string): WorldClockTick[] {
  const now = new Date();
  return [...cities]
    .sort((a, b) => a.order - b.order)
    .map((city) => buildTick(city, now, localTz, locale));
}

/** 获取所有可选时区列表（带城市名称） */
export function getAllTimezoneOptions(): TimezoneOption[] {
  const supported = listSupportedTimezones();
  // Intl 缺失枚举能力时，使用已翻译且受当前运行时支持的时区目录。
  const timezones = supported.length > 0 ? supported : Object.keys(TIMEZONE_LABELS).filter((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  });
  const options = [...new Set(['UTC', ...timezones])].map((tz) => {
    const label = tz.replace(/_/g, ' ').split('/').pop() ?? tz;
    const labelKey = TIMEZONE_LABELS[tz] ?? '';
    return { timezone: tz, label, labelKey, countryCode: getTimezoneCountryCode(tz) };
  });
  return [...options, ...COMMON_CITY_OPTIONS.map((option) => ({
    ...option,
    timezone: getCanonicalTimezone(option.timezone),
    countryCode: getTimezoneCountryCode(option.timezone),
  }))];
}

/**
 * 获取时区对应的 ISO 国家代码，用于显示国旗。
 * @param timezone - IANA 时区名称或历史别名
 * @returns 小写 ISO 3166-1 alpha-2 国家代码，UTC 等无归属时返回 undefined
 */
export function getTimezoneCountryCode(timezone: string): string | undefined {
  return TIMEZONE_COUNTRY_CODES[timezone] ?? TIMEZONE_COUNTRY_CODES[getCanonicalTimezone(timezone)] ?? undefined;
}

/**
 * 将新旧 IANA 名称统一为运行时名称，以便识别重复时区。
 * @param timezone - IANA 时区名称或历史别名
 * @returns 运行时规范名称，无法解析时保留原值
 */
export function getCanonicalTimezone(timezone: string): string {
  const cached = canonicalTimezoneCache.get(timezone);
  if (cached) return cached;
  try {
    const canonical = new Intl.DateTimeFormat('en', { timeZone: timezone }).resolvedOptions().timeZone;
    canonicalTimezoneCache.set(timezone, canonical);
    return canonical;
  } catch {
    return timezone;
  }
}

/**
 * 在渲染时翻译城市，兼容未保存翻译键的旧时钟。
 * @param city - 时区、回退名称及可选翻译键
 * @param t - 当前界面语言的翻译函数
 * @returns 当前语言的城市名称
 */
export function getCityLabel(city: Pick<WorldClockCity, 'timezone' | 'label' | 'labelKey'>, t: TFunction): string {
  const labelKey = city.labelKey
    || COMMON_CITY_OPTIONS.find((option) => option.label === city.label
      && getCanonicalTimezone(option.timezone) === getCanonicalTimezone(city.timezone))?.labelKey
    || TIMEZONE_LABELS[city.timezone];
  return labelKey ? t(labelKey, { defaultValue: city.label }) : city.label;
}

/**
 * 按显示名称、英文城市名或 IANA 时区搜索，不截断结果。
 * @param options - 完整城市时区目录
 * @param query - 用户输入的搜索文字
 * @param t - 当前界面语言的翻译函数
 * @returns 匹配的全部城市条目
 */
export function filterTimezoneOptions(options: TimezoneOption[], query: string, t: TFunction): TimezoneOption[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return options;
  const canonicalQuery = getCanonicalTimezone(query.trim()).toLowerCase();
  return options.filter((option) => {
    const englishLabel = option.labelKey ? t(option.labelKey, { lng: 'en-US', defaultValue: option.label }) : option.label;
    return [getCityLabel(option, t), englishLabel, option.label, option.timezone]
      .some((value) => value.toLowerCase().includes(normalized))
      || getCanonicalTimezone(option.timezone).toLowerCase() === canonicalQuery;
  });
}

/** 格式化 tick 日期（简短） */
function formatTickDate(now: Date, timezone: string, locale?: string): string {
  try {
    const cacheKey = `${locale ?? ''}:${timezone}`;
    let formatter = dateFormatterCache.get(cacheKey);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        month: 'numeric',
        day: 'numeric',
      });
      dateFormatterCache.set(cacheKey, formatter);
    }
    return formatter.format(now);
  } catch {
    return '';
  }
}
