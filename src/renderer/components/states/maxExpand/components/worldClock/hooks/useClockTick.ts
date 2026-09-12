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
 * @file useClockTick.ts
 * @description 定时刷新时钟 ticks Hook
 * @author 鸡哥
 */

import { useState, useEffect } from 'react';
import type { WorldClockCity, WorldClockTick } from '../types/worldClockTypes';
import { CLOCK_UPDATE_INTERVAL_MS } from '../config/worldClockConfig';
import { buildAllTicks } from '../utils/worldClockUtils';

/**
 * 定时刷新时钟 ticks Hook
 * @param cities - 城市列表
 * @param loaded - 是否已加载
 * @param localTimezone - 本机时区
 * @param locale - 当前语言
 * @returns 实时时钟 ticks
 */
export function useClockTick(
  cities: WorldClockCity[],
  loaded: boolean,
  localTimezone: string,
  locale: string,
): WorldClockTick[] {
  const [ticks, setTicks] = useState<WorldClockTick[]>([]);

  /** 定时刷新时钟 ticks */
  useEffect(() => {
    if (!loaded || cities.length === 0) {
      setTicks([]);
      return;
    }

    const update = (): void => {
      setTicks(buildAllTicks(cities, localTimezone, locale));
    };

    update();
    const timer = setInterval(update, CLOCK_UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [cities, loaded, locale, localTimezone]);

  return ticks;
}
