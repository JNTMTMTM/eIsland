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