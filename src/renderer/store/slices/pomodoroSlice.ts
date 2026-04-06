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
