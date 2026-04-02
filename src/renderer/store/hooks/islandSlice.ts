/**
 * @file islandSlice.ts
 * @description 灵动岛 UI 状态相关逻辑
 */

import type { StateCreator } from 'zustand';
import type { IslandSlice } from '../types';

export const createIslandSlice: StateCreator<
  IslandSlice,
  [],
  [],
  IslandSlice
> = (set) => ({
  state: 'idle',
  hoverTab: 'time',

  setIdle: () => {
    window.api?.collapseWindow();
    window.api?.enableMousePassthrough();
    set({ state: 'idle' });
  },

  setHover: () => {
    window.api?.expandWindow();
    window.api?.disableMousePassthrough();
    set({ state: 'hover' });
  },

  setNotification: (data) => {
    window.api?.expandWindow();
    set({ state: 'notification', notification: data });
  },

  setHoverTab: (tab) => set({ hoverTab: tab }),
});