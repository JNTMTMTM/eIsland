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
 * @file useWorldClockState.ts
 * @description 世界时钟 Tab 集中式状态管理 Hook（组合子 Hook）
 * @author 鸡哥
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserTimezone } from '@multisystemsuite/timezone-engine-core';
import type { UseWorldClockStateReturn } from '../types/worldClockTypes';
import { useCitiesPersistence } from './useCitiesPersistence';
import { useClockTick } from './useClockTick';
import { useCityOperations } from './useCityOperations';

/** 世界时钟集中式状态管理 Hook */
export function useWorldClockState(): UseWorldClockStateReturn {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const localTimezone = useRef(getUserTimezone('UTC'));
  const [showPicker, setShowPicker] = useState(false);

  const { cities, setCities, loaded } = useCitiesPersistence();
  const ticks = useClockTick(cities, loaded, localTimezone.current, locale);
  const { addCity, removeCity } = useCityOperations(setCities);

  return {
    cities,
    ticks,
    loaded,
    localTimezone: localTimezone.current,
    showPicker,
    setShowPicker,
    addCity,
    removeCity,
  };
}
