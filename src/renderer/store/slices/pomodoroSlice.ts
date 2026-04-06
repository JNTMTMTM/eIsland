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
 * @file pomodoroSlice.ts
 * @description 番茄钟状态管理 Slice
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { PomodoroSlice } from '../types';

const WORK_DURATION = 25 * 60;

export const createPomodoroSlice: StateCreator<
  PomodoroSlice,
  [],
  [],
  PomodoroSlice
> = (set) => ({
  pomodoroPhase: 'work',
  pomodoroRemaining: WORK_DURATION,
  pomodoroRunning: false,
  pomodoroCompletedCount: 0,

  setPomodoroPhase: (phase) => set({ pomodoroPhase: phase }),
  setPomodoroRemaining: (remaining) => set({ pomodoroRemaining: remaining }),
  setPomodoroRunning: (running) => set({ pomodoroRunning: running }),
  setPomodoroCompletedCount: (count) => set({ pomodoroCompletedCount: count }),
});
