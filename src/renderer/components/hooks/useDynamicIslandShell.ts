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
 * @file useDynamicIslandShell.ts
 * @description 灵动岛外壳状态与交互控制 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import useIslandStore from '../../store/isLandStore';
import type { IslandState } from '../../store/types';

const MUSIC_OUTER_GLOW_EFFECT_STORE_KEY = 'music-outer-glow-effect-enabled';

export type { IslandState };

const MORPH_DURATION_BY_SPEED: Record<string, number> = { slow: 1100, medium: 550, fast: 280 };

interface UseDynamicIslandShellOptions {
  state: IslandState;
  animationSpeed: string;
  isMusicPlaying: boolean;
  coverImage: string | null;
  isPlaying: boolean;
  setHover: () => void;
  setExpanded: () => void;
  setCli: () => void;
  hasActiveCliSessionRef: React.MutableRefObject<boolean>;
  idleClickExpandRef: React.MutableRefObject<boolean>;
  isHoveringRef: React.MutableRefObject<boolean>;
  /** pill 模式下强制 click-to-hover */
  forceClickToHover?: boolean;
}

interface DynamicIslandShellState {
  morphing: boolean;
  fromState: string;
  showGlow: string | null;
  handleIslandClick: () => void;
}

/**
 * @description 管理灵动岛壳层形变状态与点击行为。
 * @param options - 壳层交互配置。
 * @returns 壳层状态与点击处理函数。
 */
export function useDynamicIslandShell(options: UseDynamicIslandShellOptions): DynamicIslandShellState {
  const {
    state,
    animationSpeed,
    isMusicPlaying,
    coverImage,
    isPlaying,
    setHover,
    setExpanded,
    setCli,
    hasActiveCliSessionRef,
    idleClickExpandRef,
    isHoveringRef,
    forceClickToHover = false,
  } = options;

  const prevStateRef = useRef(state);
  const [morphing, setMorphing] = useState(false);
  const [fromState, setFromState] = useState('');
  const [glowEffectEnabled, setGlowEffectEnabled] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MUSIC_OUTER_GLOW_EFFECT_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') setGlowEffectEnabled(value);
    }).catch(() => {});

    const handler = (e: Event): void => {
      if (cancelled) return;
      const val = (e as CustomEvent).detail;
      if (typeof val === 'boolean') setGlowEffectEnabled(val);
    };
    window.addEventListener('music-outer-glow-effect-changed', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('music-outer-glow-effect-changed', handler);
    };
  }, []);

  useEffect(() => {
    if (prevStateRef.current === state) return;
    setFromState(prevStateRef.current);
    prevStateRef.current = state;
    setMorphing(true);
    const id = setTimeout(() => {
      setMorphing(false);
      setFromState('');
    }, MORPH_DURATION_BY_SPEED[animationSpeed] ?? 550);
    return () => clearTimeout(id);
  }, [state, animationSpeed]);

  const handleIslandClick = useCallback(() => {
    if (state === 'idle' && (forceClickToHover || idleClickExpandRef.current)) {
      isHoveringRef.current = true;
      setHover();
      return;
    }

    if (state === 'hover') {
      setExpanded();
      return;
    }

    if (state === 'expanded' || state === 'maxExpand' || state === 'announcement') {
      // 退出 maxExpand 时，仅当当前在 CLI 子标签且存在活跃的 Claude 会话才进入 cli 态
      if (state === 'maxExpand' && hasActiveCliSessionRef.current && useIslandStore.getState().maxExpandTab === 'cli') {
        setCli();
        return;
      }
      setHover();
    }
  }, [state, setExpanded, setHover, setCli, hasActiveCliSessionRef, idleClickExpandRef, isHoveringRef, forceClickToHover]);

  return {
    morphing,
    fromState,
    showGlow: glowEffectEnabled && isMusicPlaying && coverImage ? (isPlaying ? 'playing' : 'paused') : null,
    handleIslandClick,
  };
}
