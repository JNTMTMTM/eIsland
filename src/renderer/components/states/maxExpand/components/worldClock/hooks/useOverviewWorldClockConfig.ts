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
 * @file useOverviewWorldClockConfig.ts
 * @description 读取并订阅总览世界时钟配置，供 WorldClockWidget 和 WorldClockTab 共用。
 * @author 鸡哥
 */

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG,
  normalizeOverviewWorldClockConfig,
  OVERVIEW_TIMEZONES_STORE_KEY,
  type OverviewWorldClockConfig,
} from '../config/overviewWorldClockConfig';

/**
 * 订阅总览世界时钟持久化配置。
 * @returns 当前配置与 setter
 */
export function useOverviewWorldClockConfig(): [OverviewWorldClockConfig, Dispatch<SetStateAction<OverviewWorldClockConfig>>] {
  const [config, setConfig] = useState<OverviewWorldClockConfig>(DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG);

  useEffect(() => {
    let cancelled = false;
    const applyConfig = (value: unknown): void => {
      if (!cancelled) setConfig(normalizeOverviewWorldClockConfig(value));
    };

    window.api.storeRead(OVERVIEW_TIMEZONES_STORE_KEY).then(applyConfig).catch(() => {});
    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel === `store:${OVERVIEW_TIMEZONES_STORE_KEY}`) applyConfig(value);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return [config, setConfig];
}
