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
 * @file useBrightness.ts
 * @description 屏幕亮度状态与调节逻辑 Hook
 * @author 鸡哥
 */

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BRIGHTNESS_UPDATE_DELAY_MS } from '../config/brightnessConfig';

/** useBrightness 返回值类型 */
interface UseBrightnessReturn {
  brightness: number;
  isAvailable: boolean;
  handleBrightnessChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 屏幕亮度逻辑 Hook
 * @description 读取当前屏幕亮度，并在滑动时通过主进程更新系统亮度
 * @returns 亮度状态与调节回调
 */
export function useBrightness(): UseBrightnessReturn {
  const [brightness, setBrightness] = useState(50);
  const [isAvailable, setIsAvailable] = useState(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.api.getBrightness().then((value) => {
      if (cancelled || value === null) return;
      setBrightness(value);
      setIsAvailable(true);
    }).catch(() => {
      if (!cancelled) setIsAvailable(false);
    });

    return () => {
      cancelled = true;
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, []);

  const handleBrightnessChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const nextBrightness = Number(event.target.value);
    setBrightness(nextBrightness);

    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      void window.api.setBrightness(nextBrightness);
    }, BRIGHTNESS_UPDATE_DELAY_MS);
  }, []);

  return { brightness, isAvailable, handleBrightnessChange };
}
