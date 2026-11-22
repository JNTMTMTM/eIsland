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
import { resolveHoverLeaveTarget } from './hoverLeaveTarget';

/** 不自动离开悬停状态的面板状态集合 */
const AUTH_STATES = new Set(['login', 'register', 'resetPassword', 'setPassword', 'bindOAuth', 'bindEmail', 'payment', 'questionnaire', 'musicProvidersLogin', 'fileTransfer']);

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
 * @returns 鼠标首次移入可见壳层时的处理函数。
 */
export function useIslandHoverInteraction(options: UseIslandHoverInteractionOptions): () => void {
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

  const compact = state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation';

  const enterHover = useCallback(() => {
    isHoveringRef.current = true;
    setHover();
    if (state === 'lyrics' || state === 'lyricsTranslation') setHoverTab('lyrics');
  }, [isHoveringRef, setHover, setHoverTab, state]);

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
    let checkTimer: ReturnType<typeof setTimeout> | null = null;
    let aborted = false;
    let mousePassthroughState: boolean | null = null;
    const CHECK_INTERVAL = 50;

    const setMousePassthrough = (enabled: boolean): void => {
      if (mousePassthroughState === enabled) return;
      mousePassthroughState = enabled;
      if (enabled) {
        window.api?.enableMousePassthrough();
      } else {
        window.api?.disableMousePassthrough();
      }
    };

    if (state === 'maxExpand' || state === 'expanded' || state === 'announcement' || state === 'questionnaire') {
      isHoveringRef.current = true;
    }

    const scheduleCheck = (): void => {
      if (!aborted) {
        checkTimer = setTimeout(() => {
          checkTimer = null;
          void checkMousePosition();
        }, CHECK_INTERVAL);
      }
    };

    const checkMousePosition = async (): Promise<void> => {
      if (aborted) return;

      const inWindow = await isMouseInWindow();
      if (aborted) return;

      if (useIslandStore.getState().uiStateLocked) {
        clearAllTimers();
        scheduleCheck();
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
        setMousePassthrough(false);
        scheduleCheck();
        return;
      }

      if (state === 'notification' || state === 'agent' || state === 'stt' || state === 'cli' || state === 'agentVoiceInput' || state === 'guide' || state === 'login' || state === 'register' || state === 'resetPassword' || state === 'payment' || state === 'announcement' || state === 'questionnaire' || state === 'musicProvidersLogin' || state === 'fileTransfer') {
        if (inWindow) {
          setMousePassthrough(false);
        }
        scheduleCheck();
        return;
      }

      if (inWindow) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        if (!isHoveringRef.current && enterTimerRef.current === null) {
          if (compact && (forceClickToHover || idleClickExpandRef.current)) {
            if (config.mousePassthrough) {
              setMousePassthrough(false);
            }
          } else {
            enterTimerRef.current = setTimeout(() => {
              enterTimerRef.current = null;
              if (aborted || isHoveringRef.current) return;

              if (config.mousePassthrough) {
                setMousePassthrough(false);
              }
              enterHover();
            });
          }
        }
      } else {
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if (compact && (forceClickToHover || idleClickExpandRef.current) && !isHoveringRef.current) {
          setMousePassthrough(true);
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
              const target = resolveHoverLeaveTarget(useIslandStore.getState(), state === 'hover');
              if (target === 'lyrics') setLyrics();
              else if (target === 'lyricsTranslation') setLyricsTranslation();
              else setIdle(true);
            });
          }
        }
      }

      scheduleCheck();
    };

    void checkMousePosition();

    return () => {
      aborted = true;
      if (checkTimer !== null) clearTimeout(checkTimer);
      clearAllTimers();
    };
  }, [
    state,
    compact,
    enterHover,
    setIdle,
    setLyrics,
    setLyricsTranslation,
    clearAllTimers,
    isHoveringRef,
    idleClickExpandRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    enterTimerRef,
    leaveTimerRef,
    forceClickToHover,
  ]);

  return useCallback(() => {
    if (!compact || forceClickToHover || idleClickExpandRef.current || useIslandStore.getState().uiStateLocked) return;
    if (document.querySelector('.slider-captcha-overlay')) return;
    clearAllTimers();
    enterHover();
  }, [clearAllTimers, compact, enterHover, forceClickToHover, idleClickExpandRef]);
}
