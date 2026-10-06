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
 * @file useIslandAutoDim.ts
 * @description 灵动岛闲置自动降低不透明度 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { isMouseInWindow } from '../config/dynamicIslandConfig';

export const ISLAND_AUTO_DIM_ENABLED_STORE_KEY = 'island-auto-dim-enabled';
export const ISLAND_AUTO_DIM_DELAY_STORE_KEY = 'island-auto-dim-delay';
export const DEFAULT_AUTO_DIM_DELAY_SEC = 10;
const AUTO_DIM_TARGET_OPACITY = 10;

interface UseIslandAutoDimOptions {
  autoDimEnabledRef: React.MutableRefObject<boolean>;
  autoDimDelayRef: React.MutableRefObject<number>;
}

/**
 * @description 当灵动岛闲置超过指定时长后自动降低不透明度，鼠标进入时恢复。
 * @param options - 自动降低不透明度配置。
 */
export function useIslandAutoDim(options: UseIslandAutoDimOptions): void {
  const { autoDimEnabledRef, autoDimDelayRef } = options;

  useEffect(() => {
    let cancelled = false;
    let dimmed = false;
    let lastInWindowTime = Date.now();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const getOriginalOpacity = (): number => {
      const raw = document.documentElement.style.getPropertyValue('--island-opacity');
      const v = Number(raw);
      return Number.isFinite(v) && v >= 10 ? v : 100;
    };

    let savedOpacity = getOriginalOpacity();

    const dim = (): void => {
      if (dimmed) return;
      savedOpacity = getOriginalOpacity();
      document.documentElement.style.setProperty('--island-opacity', String(AUTO_DIM_TARGET_OPACITY));
      dimmed = true;
    };

    const restore = (): void => {
      if (!dimmed) return;
      document.documentElement.style.setProperty('--island-opacity', String(savedOpacity));
      dimmed = false;
    };

    const tick = async (): Promise<void> => {
      if (!autoDimEnabledRef.current) {
        if (dimmed) restore();
        return;
      }

      try {
        const inWindow = await isMouseInWindow();
        if (cancelled) return;
        if (inWindow) {
          lastInWindowTime = Date.now();
          if (dimmed) restore();
        } else {
          const elapsed = (Date.now() - lastInWindowTime) / 1000;
          if (!dimmed && elapsed >= autoDimDelayRef.current) {
            dim();
          }
        }
      } catch {
        // noop
      }
    };

    intervalId = setInterval(() => { void tick(); }, 1000);

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
      if (dimmed) restore();
    };
  }, [autoDimEnabledRef, autoDimDelayRef]);
}
