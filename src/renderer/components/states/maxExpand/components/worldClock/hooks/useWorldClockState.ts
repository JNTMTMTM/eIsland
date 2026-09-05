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
 * @description 世界时钟 Tab 集中式状态管理 Hook
 * @author 鸡哥
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserTimezone } from '@multisystemsuite/timezone-engine-core';
import type { WorldClockCity, WorldClockTick } from '../types/worldClockTypes';
import { STORE_KEY } from '../types/worldClockTypes';
import { DEFAULT_CITIES, CLOCK_UPDATE_INTERVAL_MS } from '../config/worldClockConfig';
import { persistCities, normalizeCities, buildAllTicks } from '../utils/worldClockUtils';

/** useWorldClockState Hook 返回类型 */
export interface UseWorldClockStateReturn {
  /** 持久化的城市列表 */
  cities: WorldClockCity[];
  /** 实时时钟 ticks */
  ticks: WorldClockTick[];
  /** 是否已从 store 加载 */
  loaded: boolean;
  /** 本机时区 */
  localTimezone: string;
  /** 城市选择器可见性 */
  showPicker: boolean;
  /** 设置选择器可见性 */
  setShowPicker: (v: boolean) => void;
  /** 添加城市（自动去重） */
  addCity: (city: WorldClockCity) => void;
  /** 移除城市 */
  removeCity: (timezone: string) => void;
}

/** 世界时钟集中式状态管理 Hook */
export function useWorldClockState(): UseWorldClockStateReturn {
  const [cities, setCities] = useState<WorldClockCity[]>([]);
  const [ticks, setTicks] = useState<WorldClockTick[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const localTimezone = useRef(getUserTimezone('UTC'));
  const skipPersistOnceRef = useRef(false);

  /** 启动时从文件加载 */
  useEffect(() => {
    let cancelled = false;
    const applyCities = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setCities(normalizeCities(data));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setCities(normalizeCities(data));
      } else {
        setCities(DEFAULT_CITIES);
      }
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) {
        setCities(DEFAULT_CITIES);
        setLoaded(true);
      }
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        applyCities(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** cities 变化时持久化 */
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    persistCities(cities);
  }, [cities, loaded]);

  /** 定时刷新时钟 ticks */
  useEffect(() => {
    if (!loaded || cities.length === 0) {
      setTicks([]);
      return;
    }

    const update = (): void => {
      setTicks(buildAllTicks(cities, localTimezone.current));
    };

    update();
    const timer = setInterval(update, CLOCK_UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [cities, loaded]);

  /** 添加城市（去重） */
  const addCity = useCallback((city: WorldClockCity): void => {
    setCities((prev) => {
      if (prev.some((c) => c.timezone === city.timezone)) return prev;
      return [...prev, { ...city, order: prev.length }];
    });
    setShowPicker(false);
  }, []);

  /** 移除城市 */
  const removeCity = useCallback((timezone: string): void => {
    setCities((prev) =>
      prev
        .filter((c) => c.timezone !== timezone)
        .map((c, i) => ({ ...c, order: i })),
    );
  }, []);

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
