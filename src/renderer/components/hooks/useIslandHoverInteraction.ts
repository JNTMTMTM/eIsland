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
 * @file useIslandHoverInteraction.ts
 * @description 灵动岛悬停与鼠标穿透交互控制 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect } from 'react';
import useIslandStore from '../../store/isLandStore';
import type { IslandState } from './useDynamicIslandShell';
import { STATE_CONFIGS, isMouseInWindow } from '../config/dynamicIslandConfig';
import { isCurrentLyricIdenticalToTranslation } from '../states/lyrics/utils/isCurrentLyricIdenticalToTranslation';

/** 不自动离开悬停状态的面板状态集合 */
const AUTH_STATES = new Set(['login', 'register', 'resetPassword', 'setPassword', 'bindOAuth', 'bindEmail', 'payment']);

interface UseIslandHoverInteractionOptions {
  state: IslandState;
  setHover: () => void;
  setIdle: (force?: boolean) => void;
  setLyrics: () => void;
  setLyricsTranslation: () => void;
  setHoverTab: (tab: 'time' | 'lyrics' | 'weather' | 'expand') => void;
  isHoveringRef: React.MutableRefObject<boolean>;
  idleClickExpandRef: React.MutableRefObject<boolean>;
  expandLeaveIdleRef: React.MutableRefObject<boolean>;
  maxExpandLeaveIdleRef: React.MutableRefObject<boolean>;
  enterTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  leaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  /** pill 模式下强制 click-to-hover */
  forceClickToHover?: boolean;
}

/**
 * @description 处理灵动岛进入/离开窗口时的状态切换逻辑。
 * @param options - 悬停交互控制参数。
 */
export function useIslandHoverInteraction(options: UseIslandHoverInteractionOptions): void {
  const {
    state,
    setHover,
    setIdle,
    setLyrics,
    setLyricsTranslation,
    setHoverTab,
    isHoveringRef,
    idleClickExpandRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    enterTimerRef,
    leaveTimerRef,
    forceClickToHover = false,
  } = options;

  /** pill 模式下始终 click-to-hover，读取 ref 保持运行时最新 */

  const clearAllTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, [enterTimerRef, leaveTimerRef]);

  useEffect(() => {
    let rafId: number | null = null;
    let aborted = false;
    let lastCheckTime = 0;
    const CHECK_INTERVAL = 16;

    if (state === 'maxExpand' || state === 'expanded' || state === 'announcement') {
      isHoveringRef.current = true;
    }

    const checkMousePosition = async (): Promise<void> => {
      if (aborted) return;

      const now = Date.now();
      if (now - lastCheckTime < CHECK_INTERVAL) {
        rafId = requestAnimationFrame(checkMousePosition);
        return;
      }
      lastCheckTime = now;

      const inWindow = await isMouseInWindow();
      if (aborted) return;

      if (useIslandStore.getState().uiStateLocked) {
        clearAllTimers();
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      const config = STATE_CONFIGS[state];
      const sliderCaptchaActive = Boolean(document.querySelector('.slider-captcha-overlay'));

      if (sliderCaptchaActive) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        isHoveringRef.current = true;
        window.api?.disableMousePassthrough();
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      if (state === 'notification' || state === 'agent' || state === 'stt' || state === 'cli' || state === 'agentVoiceInput' || state === 'guide' || state === 'login' || state === 'register' || state === 'resetPassword' || state === 'payment' || state === 'announcement') {
        if (inWindow) {
          window.api?.disableMousePassthrough();
        }
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      if (inWindow) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        if (!isHoveringRef.current && enterTimerRef.current === null) {
          /** pill 模式下 idle/lyrics/lyricsTranslation/agentVoiceInput 均需点击才展开 */
          const clickToHoverStates = state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || (state as string) === 'agentVoiceInput';
          if (clickToHoverStates && (forceClickToHover || idleClickExpandRef.current)) {
            if (config.mousePassthrough) {
              window.api?.disableMousePassthrough();
            }
          } else {
            enterTimerRef.current = setTimeout(() => {
              enterTimerRef.current = null;
              if (aborted || isHoveringRef.current) return;

              isHoveringRef.current = true;
              if (config.mousePassthrough) {
                window.api?.disableMousePassthrough();
              }
              setHover();
              if (state === 'lyrics' || state === 'lyricsTranslation') {
                setHoverTab('lyrics');
              }
            });
          }
        }
      } else {
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if ((state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || (state as string) === 'agentVoiceInput') && (forceClickToHover || idleClickExpandRef.current) && !isHoveringRef.current) {
          window.api?.enableMousePassthrough();
        }

        if (isHoveringRef.current && leaveTimerRef.current === null) {
          const shouldLeave = AUTH_STATES.has(state)
            ? false
            : state === 'expanded' ? expandLeaveIdleRef.current
              : state === 'maxExpand' ? maxExpandLeaveIdleRef.current
                : true;

          if (shouldLeave) {
            leaveTimerRef.current = setTimeout(() => {
              leaveTimerRef.current = null;
              if (aborted || !isHoveringRef.current) return;

              isHoveringRef.current = false;
              const store = useIslandStore.getState();
              if (store.isPlaying && store.timerData.state === 'idle' && ((store.syncedLyrics?.length ?? 0) > 0 || store.lyricsLoading)) {
                const hasTranslation = store.translationLyrics?.status === 'available'
                  && Boolean(store.translationLyrics.lines && store.translationLyrics.lines.length > 0);
                if (hasTranslation) {
                  /** 原文与翻译完全一致时回退到普通歌词 */
                  if (isCurrentLyricIdenticalToTranslation(store.syncedLyrics, store.translationLyrics, store.currentPositionMs)) {
                    setLyrics();
                  } else {
                    setLyricsTranslation();
                  }
                } else {
                  setLyrics();
                }
              } else {
                setIdle(true);
              }
            });
          }
        }
      }

      if (!aborted) {
        rafId = requestAnimationFrame(checkMousePosition);
      }
    };

    rafId = requestAnimationFrame(checkMousePosition);

    return () => {
      aborted = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearAllTimers();
    };
  }, [
    state,
    setHover,
    setIdle,
    setLyrics,
    setLyricsTranslation,
    setHoverTab,
    clearAllTimers,
    isHoveringRef,
    idleClickExpandRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    enterTimerRef,
    leaveTimerRef,
    forceClickToHover,
  ]);
}
