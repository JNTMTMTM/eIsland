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
 * @file useIdle.ts
 * @description Idle 状态交互逻辑 Hook
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { MUSIC_OUTER_GLOW_EFFECT_STORE_KEY, type IdleContentProps } from '../config/idleConfig';
import { checkP0Count } from '../utils/checkP0Count';
import { TODOS_UPDATED_EVENT, STORE_KEY, LOCAL_STORAGE_KEY } from '../../maxExpand/components/todo/config/todoConfig';
import { padZero } from '../utils/padZero';

/** Idle 状态交互逻辑 Hook */
export function useIdle(props: IdleContentProps) {
  const { t } = useTranslation();
  const { isMusicPlaying, coverImage, isPlaying, handleNowPlayingUpdate, dominantColor } = useIslandStore(useShallow((store) => ({
    isMusicPlaying: store.isMusicPlaying,
    coverImage: store.coverImage,
    isPlaying: store.isPlaying,
    handleNowPlayingUpdate: store.handleNowPlayingUpdate,
    dominantColor: store.dominantColor,
  })));
  const { remainingSeconds, pomodoroRemaining, timerState, pomodoroRunning } = props;

  const isTimerActive = timerState === 'running' || timerState === 'paused';
  const isPomodoroActive = pomodoroRunning;

  const checkP0 = useCallback((): number => checkP0Count(), []);
  const [p0Count, setP0Count] = useState(checkP0);
  const [musicOuterGlowEffectEnabled, setMusicOuterGlowEffectEnabled] = useState<boolean>(true);

  useEffect(() => {
    const update = (): void => setP0Count(checkP0());
    const countItems = (items: unknown): void => {
      if (Array.isArray(items)) setP0Count(items.filter((item) => item && !item.done && item.priority === 'P0').length);
    };
    const localUpdate = (event: Event): void => countItems((event as CustomEvent).detail);
    const storageUpdate = (event: StorageEvent): void => { if (event.key === LOCAL_STORAGE_KEY || event.key === null) update(); };
    const unsubscribe = window.api?.onSettingsChanged?.((channel, value) => { if (channel === 'store:' + STORE_KEY) countItems(value); });
    window.addEventListener(TODOS_UPDATED_EVENT, localUpdate);
    window.addEventListener('storage', storageUpdate);
    return () => {
      unsubscribe?.();
      window.removeEventListener(TODOS_UPDATED_EVENT, localUpdate);
      window.removeEventListener('storage', storageUpdate);
    };
  }, [checkP0]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MUSIC_OUTER_GLOW_EFFECT_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setMusicOuterGlowEffectEnabled(value);
      }
    }).catch(() => {});

    const handler = (e: Event): void => {
      if (cancelled) return;
      const val = (e as CustomEvent).detail;
      if (typeof val === 'boolean') setMusicOuterGlowEffectEnabled(val);
    };
    window.addEventListener('music-outer-glow-effect-changed', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('music-outer-glow-effect-changed', handler);
    };
  }, []);

  useEffect(() => {
    if (!isMusicPlaying || isPlaying) {
      return;
    }
    const timer = setTimeout(() => {
      handleNowPlayingUpdate(null);
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, isMusicPlaying, handleNowPlayingUpdate]);

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;

  const pomodoroM = Math.floor(pomodoroRemaining / 60);
  const pomodoroS = pomodoroRemaining % 60;

  const [r, g, b] = dominantColor;

  return {
    ...props,
    t,
    isMusicPlaying,
    coverImage,
    isPlaying,
    musicOuterGlowEffectEnabled,
    isTimerActive,
    isPomodoroActive,
    p0Count,
    h,
    m,
    s,
    pomodoroM,
    pomodoroS,
    r,
    g,
    b,
    padZero,
  };
}
