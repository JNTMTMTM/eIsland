/**
 * @file islandSlice.ts
 * @description 灵动岛 UI 状态相关逻辑
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { IslandSlice } from '../types';
import { emptyNotification } from '../constants/defaults';

export const createIslandSlice: StateCreator<
  IslandSlice,
  [],
  [],
  IslandSlice
> = (set) => ({
  state: 'idle',
  hoverTab: 'time',
  expandTab: 'overview',
  maxExpandTab: 'todo',
  notification: emptyNotification,

  setIdle: () => set((prev) => {
    if (prev.state === 'expanded' || prev.state === 'maxExpand') return prev;
    window.api?.collapseWindow();
    window.api?.enableMousePassthrough();
    return { state: 'idle' as const };
  }),

  setHover: () => {
    window.api?.expandWindow();
    window.api?.disableMousePassthrough();
    set({ state: 'hover' });
  },

  setExpanded: () => {
    window.api?.expandWindowFull();
    window.api?.disableMousePassthrough();
    set({ state: 'expanded' });
  },

  setMaxExpand: () => {
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
    set({ state: 'maxExpand' });
  },

  setNotification: (data) => {
    window.api?.expandWindow();
    set({ state: 'notification', notification: data });
  },

  setHoverTab: (tab) => set({ hoverTab: tab }),
  setExpandTab: (tab) => set({ expandTab: tab }),
  setMaxExpandTab: (tab) => set({ maxExpandTab: tab }),
});