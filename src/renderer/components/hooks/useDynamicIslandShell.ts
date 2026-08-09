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
const MUSIC_MARQUEE_MODE_STORE_KEY = 'music-marquee-mode';

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
  setHoverTab: (tab: 'time' | 'lyrics' | 'weather' | 'expand') => void;
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
  marqueeRhythmEnabled: boolean;
  marqueeAmplitudeEnabled: boolean;
  marqueeAmplitudeLevel: number;
  marqueeBeatPulse: boolean;
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
    setHoverTab,
    hasActiveCliSessionRef,
    idleClickExpandRef,
    isHoveringRef,
    forceClickToHover = false,
  } = options;

  const prevStateRef = useRef(state);
  const [morphing, setMorphing] = useState(false);
  const [fromState, setFromState] = useState('');
  const [glowEffectEnabled, setGlowEffectEnabled] = useState<boolean>(true);
  const [marqueeMode, setMarqueeMode] = useState<'normal' | 'rhythm' | 'amplitude'>('normal');
  const [marqueeBeatPulse, setMarqueeBeatPulse] = useState(false);
  const [marqueeAmplitudeLevel, setMarqueeAmplitudeLevel] = useState(0);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MUSIC_MARQUEE_MODE_STORE_KEY).then((value) => {
      if (!cancelled && (value === 'normal' || value === 'rhythm' || value === 'amplitude')) setMarqueeMode(value);
    }).catch(() => {});

    const handler = (event: Event): void => {
      const value = (event as CustomEvent).detail;
      if (value === 'normal' || value === 'rhythm' || value === 'amplitude') setMarqueeMode(value);
    };
    window.addEventListener('music-marquee-mode-changed', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('music-marquee-mode-changed', handler);
    };
  }, []);

  useEffect(() => {
    const usesAnalyzer = marqueeMode === 'rhythm' || marqueeMode === 'amplitude';
    if (!usesAnalyzer || !isMusicPlaying || !isPlaying || !glowEffectEnabled) {
      window.api.musicMarqueeBeatStop().catch(() => {});
      setMarqueeBeatPulse(false);
      setMarqueeAmplitudeLevel(0);
      return;
    }

    let cancelled = false;
    let pulseTimer: number | undefined;
    let beatClockTimer: number | undefined;
    let lastNativeBeatAt = 0;
    let smoothedAmplitude = 0;
    const bpmSamples: number[] = [];

    const triggerPulse = (): void => {
      setMarqueeBeatPulse(false);
      window.requestAnimationFrame(() => {
        if (!cancelled) setMarqueeBeatPulse(true);
      });
      if (pulseTimer !== undefined) window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => setMarqueeBeatPulse(false), 280);
    };

    const synchronizeBeatClock = (periodMs: number): void => {
      if (beatClockTimer !== undefined) window.clearTimeout(beatClockTimer);
      const tick = (): void => {
        if (cancelled) return;
        triggerPulse();
        beatClockTimer = window.setTimeout(tick, periodMs);
      };
      beatClockTimer = window.setTimeout(tick, periodMs);
    };

    window.api.musicMarqueeBeatStart().catch(() => {});
    const pollTimer = window.setInterval(() => {
      window.api.musicMarqueeBeatGet().then((result) => {
        if (cancelled || !result) return;
        if (marqueeMode === 'amplitude') {
          const sampleStrength = Math.min(1, Math.max(result.amplitude.rms * 2.4, result.amplitude.peak * 0.7));
          const gatedStrength = sampleStrength < 0.05 ? 0 : sampleStrength;
          smoothedAmplitude = smoothedAmplitude * 0.68 + gatedStrength * 0.32;
          setMarqueeAmplitudeLevel(smoothedAmplitude);
          return;
        }

        if (beatClockTimer !== undefined || result.beat.isBeat !== true) return;
        const bpm = result.beat.bpm;
        if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) return;

        const now = performance.now();
        if (now - lastNativeBeatAt < 150) return;
        lastNativeBeatAt = now;
        bpmSamples.push(bpm);
        if (bpmSamples.length < 4) return;

        const sortedBpms = [...bpmSamples].sort((left, right) => left - right);
        const detectedBpm = sortedBpms[Math.floor(sortedBpms.length / 2)];
        const subdivision = detectedBpm >= 160 ? 8 : 4;
        const baseBpm = subdivision === 8 ? detectedBpm / 2 : detectedBpm;
        const periodMs = subdivision === 8 ? 30_000 / baseBpm : 60_000 / baseBpm;
        triggerPulse();
        synchronizeBeatClock(periodMs);
      }).catch(() => {});
    }, marqueeMode === 'amplitude' ? 50 : 80);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      if (pulseTimer !== undefined) window.clearTimeout(pulseTimer);
      if (beatClockTimer !== undefined) window.clearTimeout(beatClockTimer);
      setMarqueeAmplitudeLevel(0);
      window.api.musicMarqueeBeatStop().catch(() => {});
    };
  }, [glowEffectEnabled, isMusicPlaying, isPlaying, marqueeMode]);

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
    /** pill 模式下 idle/lyrics/lyricsTranslation/agentVoiceInput 点击均进入 hover */
    const clickToHoverStates = state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || (state as string) === 'agentVoiceInput';
    if (clickToHoverStates && (forceClickToHover || idleClickExpandRef.current)) {
      isHoveringRef.current = true;
      setHover();
      if (state === 'lyrics' || state === 'lyricsTranslation') {
        setHoverTab('lyrics');
      }
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
  }, [state, setExpanded, setHover, setCli, setHoverTab, hasActiveCliSessionRef, idleClickExpandRef, isHoveringRef, forceClickToHover]);

  return {
    morphing,
    fromState,
    showGlow: glowEffectEnabled && isMusicPlaying && coverImage ? (isPlaying ? 'playing' : 'paused') : null,
    marqueeRhythmEnabled: marqueeMode === 'rhythm',
    marqueeAmplitudeEnabled: marqueeMode === 'amplitude',
    marqueeAmplitudeLevel,
    marqueeBeatPulse,
    handleIslandClick,
  };
}
