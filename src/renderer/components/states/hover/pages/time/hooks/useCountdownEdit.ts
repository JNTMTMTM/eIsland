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
 * @file useCountdownEdit.ts
 * @description 可编辑计时器逻辑 Hook（状态管理、输入处理、倒计时控制）
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef } from 'react';
import useIslandStore from '../../../../../../store/slices';
import type { TimerState } from '../types/timeTabTypes';
import { padZero, getTimeParts } from '../utils/timerUtils';

/**
 * 可编辑计时器逻辑 Hook
 * @description 管理倒计时状态、输入框交互和开始/暂停/重置控制
 * @returns 计时器状态与操作回调
 */
export function useCountdownEdit(): {
  timerState: TimerState;
  isEditing: boolean;
  inputHours: string;
  inputMinutes: string;
  inputSeconds: string;
  h: number;
  m: number;
  s: number;
  timerInputsRef: React.RefObject<HTMLDivElement | null>;
  handleInputChange: (value: string, setter: 'inputHours' | 'inputMinutes' | 'inputSeconds', max: number) => void;
  handleStart: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleReset: () => void;
} {
  const { timerData, setTimerData } = useIslandStore();

  const timerState: TimerState = timerData?.state ?? 'idle';
  const remainingSeconds: number = timerData?.remainingSeconds ?? 0;
  const inputHours: string = timerData?.inputHours ?? '00';
  const inputMinutes: string = timerData?.inputMinutes ?? '00';
  const inputSeconds: string = timerData?.inputSeconds ?? '00';

  const handleInputChange = useCallback((
    value: string,
    setter: 'inputHours' | 'inputMinutes' | 'inputSeconds',
    max: number
  ) => {
    const num = parseInt(value, 10);
    const newValue = (!isNaN(num) && num <= max)
      ? value.padStart(2, '0')
      : (value === '' ? '00' : timerData?.[setter] ?? '00');

    setTimerData({ [setter]: newValue });
  }, [timerData, setTimerData]);

  const timerDataRef = useRef(timerData);
  timerDataRef.current = timerData;
  const setTimerDataRef = useRef(setTimerData);
  setTimerDataRef.current = setTimerData;
  const timerInputsRef = useRef<HTMLDivElement>(null);
  const isEditing = timerState === 'idle';

  useEffect(() => {
    const el = timerInputsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      const setter = target.getAttribute('data-setter') as 'inputHours' | 'inputMinutes' | 'inputSeconds' | null;
      const maxStr = target.getAttribute('data-max');
      if (!setter || !maxStr) return;
      e.preventDefault();
      const max = parseInt(maxStr, 10);
      const delta = e.deltaY < 0 ? 1 : -1;
      const currentStr = timerDataRef.current?.[setter] ?? '00';
      const current = parseInt(currentStr, 10) || 0;
      let next = current + delta;
      if (next < 0) next = max;
      if (next > max) next = 0;
      setTimerDataRef.current({ [setter]: padZero(next) });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isEditing]);

  const handleStart = useCallback(() => {
    const h = parseInt(inputHours, 10) || 0;
    const m = parseInt(inputMinutes, 10) || 0;
    const s = parseInt(inputSeconds, 10) || 0;
    const total = h * 3600 + m * 60 + s;

    if (total > 0) {
      setTimerData({
        state: 'running',
        remainingSeconds: total,
      });
    }
  }, [inputHours, inputMinutes, inputSeconds, setTimerData]);

  const handlePause = useCallback(() => {
    setTimerData({ state: 'paused' });
  }, [setTimerData]);

  const handleResume = useCallback(() => {
    if (remainingSeconds > 0) {
      setTimerData({ state: 'running' });
    }
  }, [remainingSeconds, setTimerData]);

  const handleReset = useCallback(() => {
    setTimerData({
      state: 'idle',
      remainingSeconds: 0,
      inputHours: '00',
      inputMinutes: '00',
      inputSeconds: '00',
    });
  }, [setTimerData]);

  const { h, m, s } = getTimeParts(remainingSeconds);

  return {
    timerState,
    isEditing,
    inputHours,
    inputMinutes,
    inputSeconds,
    h,
    m,
    s,
    timerInputsRef,
    handleInputChange,
    handleStart,
    handlePause,
    handleResume,
    handleReset,
  };
}
