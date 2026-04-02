/**
 * @file timerSlice.ts
 * @description 计时器相关逻辑
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { TimerSlice } from '../types';
import { getDefaultCountdown, getDefaultTimerData } from '../constants/defaults';

export const createTimerSlice: StateCreator<
  TimerSlice,
  [],
  [],
  TimerSlice
> = (set) => ({
  countdown: getDefaultCountdown(),
  timerData: getDefaultTimerData(),

  setCountdown: (config) =>
    set((state) => ({
      countdown: { ...state.countdown, ...config }
    })),

  setTimerData: (data) =>
    set((state) => ({
      timerData: {
        state: data.state ?? state.timerData.state,
        remainingSeconds: data.remainingSeconds ?? state.timerData.remainingSeconds,
        inputHours: data.inputHours ?? state.timerData.inputHours,
        inputMinutes: data.inputMinutes ?? state.timerData.inputMinutes,
        inputSeconds: data.inputSeconds ?? state.timerData.inputSeconds,
      }
    })),
});