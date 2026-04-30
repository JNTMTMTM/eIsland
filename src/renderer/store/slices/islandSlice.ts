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

function isStandaloneRenderer(): boolean {
  try {
    const pathname = window.location?.pathname ?? '';
    return pathname.includes('standalone.html');
  } catch {
    return false;
  }
}

export const createIslandSlice: StateCreator<
  IslandSlice,
  [],
  [],
  IslandSlice
> = (set, get) => ({
  state: 'idle',
  authReturnState: null,
  uiStateLocked: false,
  paymentContext: { type: 'pro' },
  hoverTab: 'time',
  expandTab: 'overview',
  maxExpandTab: 'todo',
  notification: emptyNotification,
  springAnimation: true,

  setIdle: (force?: boolean) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'idle') return prev;
    if (!force && (prev.state === 'expanded' || prev.state === 'maxExpand' || prev.state === 'guide' || prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'announcement')) return prev;
    window.api?.collapseWindow();
    window.api?.enableMousePassthrough();
    return { state: 'idle' as const, authReturnState: null };
  }),

  setHover: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'hover') return prev;
    window.api?.expandWindow();
    window.api?.disableMousePassthrough();
    return { state: 'hover', authReturnState: null };
  }),

  setExpanded: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'expanded') return prev;
    window.api?.expandWindowFull();
    window.api?.disableMousePassthrough();
    return { state: 'expanded', authReturnState: null };
  }),

  setMaxExpand: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'maxExpand') return prev;
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
    return { state: 'maxExpand', authReturnState: null };
  }),

  setLogin: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'login') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'login', authReturnState: nextAuthReturnState };
  }),

  setRegister: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'register') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'register', authReturnState: nextAuthReturnState };
  }),

  setPayment: (context) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'payment') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'payment', authReturnState: nextAuthReturnState, paymentContext: context ?? { type: 'pro' } };
  }),

  returnFromAuth: () => set((prev) => {
    if (prev.uiStateLocked) return prev;
    const standalone = isStandaloneRenderer();
    const target = prev.authReturnState ?? 'maxExpand';

    if (!standalone) {
      if (target === 'idle') {
        window.api?.collapseWindow();
        window.api?.enableMousePassthrough();
      } else if (target === 'hover') {
        window.api?.expandWindow();
        window.api?.disableMousePassthrough();
      } else if (target === 'expanded') {
        window.api?.expandWindowFull();
        window.api?.disableMousePassthrough();
      } else if (target === 'maxExpand' || target === 'guide' || target === 'login' || target === 'register' || target === 'payment' || target === 'announcement') {
        window.api?.expandWindowSettings();
        window.api?.disableMousePassthrough();
      } else if (target === 'lyrics') {
        window.api?.expandWindowLyrics();
        window.api?.enableMousePassthrough();
      } else if (target === 'notification') {
        window.api?.expandWindowNotification();
        window.api?.disableMousePassthrough();
      }
    }
    return { state: target === 'login' || target === 'register' || target === 'payment' ? 'maxExpand' : target, authReturnState: null };
  }),

  setLyrics: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'lyrics') return prev;
    window.api?.expandWindowLyrics();
    window.api?.enableMousePassthrough();
    return { state: 'lyrics', authReturnState: null };
  }),

  setNotification: (data) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'notification') return prev;
    window.api?.expandWindowNotification();
    return { state: 'notification', notification: data, authReturnState: null };
  }),

  setGuide: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'guide') return prev;
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
    return { state: 'guide' as const, authReturnState: null };
  }),

  setAnnouncement: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'announcement') return prev;
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
    return { state: 'announcement' as const, authReturnState: null };
  }),

  toggleUiStateLock: () => {
    const next = !get().uiStateLocked;
    set({ uiStateLocked: next });
    return next;
  },

  setHoverTab: (tab) => set({ hoverTab: tab }),
  setExpandTab: (tab) => set({ expandTab: tab }),
  setMaxExpandTab: (tab) => set({ maxExpandTab: tab }),
  setSpringAnimation: (enabled) => set({ springAnimation: enabled }),
});