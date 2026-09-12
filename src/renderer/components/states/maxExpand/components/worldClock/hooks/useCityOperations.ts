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
 * @file useCityOperations.ts
 * @description 城市增删操作 Hook
 * @author 鸡哥
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { WorldClockCity, UseCityOperationsReturn } from '../types/worldClockTypes';
import { getCanonicalTimezone } from '../utils/worldClockUtils';

/**
 * 城市增删操作 Hook
 * @param setCities - 城市列表 setter
 * @returns 添加/移除城市回调
 */
export function useCityOperations(
  setCities: Dispatch<SetStateAction<WorldClockCity[]>>,
): UseCityOperationsReturn {
  /** 添加城市（去重，不自动关闭选择器） */
  const addCity = useCallback((city: WorldClockCity): void => {
    setCities((prev) => {
      if (prev.some((c) => getCanonicalTimezone(c.timezone) === getCanonicalTimezone(city.timezone))) return prev;
      return [...prev, { ...city, order: prev.length }];
    });
  }, [setCities]);

  /** 移除城市 */
  const removeCity = useCallback((timezone: string): void => {
    setCities((prev) =>
      prev
        .filter((c) => c.timezone !== timezone)
        .map((c, i) => ({ ...c, order: i })),
    );
  }, [setCities]);

  return { addCity, removeCity };
}
