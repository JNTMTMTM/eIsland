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
 * @file useCitiesPersistence.ts
 * @description 城市列表持久化与跨窗口同步 Hook
 * @author 鸡哥
 */

import { useState, useEffect, useRef } from 'react';
import type { WorldClockCity, UseCitiesPersistenceReturn } from '../types/worldClockTypes';
import { STORE_KEY } from '../types/worldClockTypes';
import { DEFAULT_CITIES } from '../config/worldClockConfig';
import { persistCities, normalizeCities } from '../utils/worldClockUtils';

/** 城市列表持久化与跨窗口同步 Hook */
export function useCitiesPersistence(): UseCitiesPersistenceReturn {
  const [cities, setCities] = useState<WorldClockCity[]>([]);
  const [loaded, setLoaded] = useState(false);
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

  return { cities, setCities, loaded };
}
