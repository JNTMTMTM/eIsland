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
 * @file useVolume.ts
 * @description 系统音量状态与调节逻辑 Hook
 * @author 鸡哥
 */

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { VOLUME_UPDATE_DELAY_MS } from '../config/volumeConfig';

/** useVolume 返回值类型 */
interface UseVolumeReturn {
  volume: number;
  isAvailable: boolean;
  handleVolumeChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 系统音量逻辑 Hook
 * @description 读取默认播放设备音量，并在滑动时通过主进程更新系统音量
 * @returns 音量状态与调节回调
 */
export function useVolume(): UseVolumeReturn {
  const [volume, setVolume] = useState(50);
  const [isAvailable, setIsAvailable] = useState(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.api.getVolume().then((value) => {
      if (cancelled || value === null) return;
      setVolume(value);
      setIsAvailable(true);
    }).catch(() => {
      if (!cancelled) setIsAvailable(false);
    });

    return () => {
      cancelled = true;
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, []);

  const handleVolumeChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);

    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      void window.api.setVolume(nextVolume);
    }, VOLUME_UPDATE_DELAY_MS);
  }, []);

  return { volume, isAvailable, handleVolumeChange };
}