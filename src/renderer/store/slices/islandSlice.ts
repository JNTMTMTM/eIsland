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

  setLyrics: () => {
    window.api?.expandWindowLyrics();
    window.api?.enableMousePassthrough();
    set({ state: 'lyrics' });
  },

  setNotification: (data) => {
    window.api?.expandWindowNotification();
    set({ state: 'notification', notification: data });
  },

  setHoverTab: (tab) => set({ hoverTab: tab }),
  setExpandTab: (tab) => set({ expandTab: tab }),
  setMaxExpandTab: (tab) => set({ maxExpandTab: tab }),
});