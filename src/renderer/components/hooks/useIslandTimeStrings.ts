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
 * @file useIslandTimeStrings.ts
 * @description 灵动岛时间字符串计算 Hook。
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import { formatTime, formatFullTime, getDayName, getLunarDate } from '../../utils/timeUtils';

interface UseIslandTimeStringsOptions {
  t: (key: string, options?: { defaultValue?: string }) => string;
  language: string | undefined;
  precision?: 'minute' | 'second';
  enabled?: boolean;
}

interface IslandTimeStrings {
  timeStr: string;
  dayStr: string;
  fullTimeStr: string;
  lunarStr: string;
}

/**
 * @description 提供灵动岛展示所需的时间与日期文本。
 * @param options - 时间文本格式化配置。
 * @returns 灵动岛时间字符串集合。
 */
export function useIslandTimeStrings(options: UseIslandTimeStringsOptions): IslandTimeStrings {
  const { t, language, precision = 'second', enabled = true } = options;

  const formatWeekday = useMemo(() => {
    return (date: Date): string => t(`overview.time.weekdays.${date.getDay()}`, { defaultValue: getDayName(date) });
  }, [t, language]);

  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => formatWeekday(new Date()));
  const [fullTimeStr, setFullTimeStr] = useState(() => formatFullTime(new Date()));
  const [lunarStr, setLunarStr] = useState(() => getLunarDate(new Date()));

  useEffect(() => {
    if (!enabled) return;
    let dateKey = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const period = precision === 'minute' ? 60_000 : 1000;
    const update = (): void => {
      clearTimeout(timer);
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = new Date();
      setTimeStr(formatTime(now));

      setFullTimeStr(formatFullTime(now));
      const nextDateKey = now.toDateString();
      if (nextDateKey !== dateKey) {
        dateKey = nextDateKey;
        setDayStr(formatWeekday(now));
        setLunarStr(getLunarDate(now));
      }
      timer = setTimeout(update, period - (Date.now() % period));
    };

    update();
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', update);
    };
  }, [formatWeekday, precision, enabled]);

  return {
    timeStr,
    dayStr,
    fullTimeStr,
    lunarStr,
  };
}
