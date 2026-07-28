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
import { playNotificationSoundOnce } from '../../utils/audio/notificationSound';

function isStandaloneRenderer(): boolean {
  try {
    const pathname = window.location?.pathname ?? '';
    return pathname.includes('DynamicIslandStandalone.html');
  } catch {
    return false;
  }
}

function readCliProvider(): 'claude' | 'codex' {
  try {
    return window.localStorage.getItem('eisland-cli-provider') === 'codex' ? 'codex' : 'claude';
  } catch {
    return 'claude';
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
  setPasswordContext: { tempToken: '', suggestedUsername: '', email: '' },
  bindOAuthContext: { tempToken: '', username: '', email: '' },
  bindEmailContext: { tempToken: '', suggestedUsername: '' },
  hoverTab: 'time',
  expandTab: 'overview',
  maxExpandTab: 'todo',
  cliProvider: readCliProvider(),
  notification: emptyNotification,
  sttText: '',
  agentPrompt: '',
  captureTranslate: {
    status: 'submitting',
    originalImage: '',
    taskId: null,
    translatedImage: null,
    translatedText: '',
    errorMessage: '',
  },
  springAnimation: true,
  animationSpeed: 'medium' as const,
  shapeMode: 'notch' as const,

  setIdle: (force?: boolean) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'idle') return prev;
    if (!force && (prev.state === 'expanded' || prev.state === 'maxExpand' || prev.state === 'captureTranslate' || prev.state === 'guide' || prev.state === 'login' || prev.state === 'register' || prev.state === 'resetPassword' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail' || prev.state === 'payment' || prev.state === 'announcement')) return prev;
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
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'payment', authReturnState: nextAuthReturnState, paymentContext: context ?? { type: 'pro' } };
  }),

  setSetPassword: (context) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'setPassword') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'setPassword' as never, authReturnState: nextAuthReturnState, setPasswordContext: context };
  }),

  setBindOAuth: (context) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'bindOAuth') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'bindOAuth' as never, authReturnState: nextAuthReturnState, bindOAuthContext: context };
  }),

  setBindEmail: (context) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'bindEmail') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      window.api?.expandWindowSettings();
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'bindEmail' as never, authReturnState: nextAuthReturnState, bindEmailContext: context };
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
      } else if (target === 'lyrics' || target === 'agentVoiceInput' || target === 'lyricsTranslation') {
        if (target === 'lyricsTranslation') {
          window.api?.expandWindowLyricsTranslation();
        } else {
          window.api?.expandWindowLyrics();
        }
        window.api?.enableMousePassthrough();
      } else if (target === 'notification' || target === 'agent' || target === 'stt') {
        window.api?.expandWindowNotification();
        window.api?.disableMousePassthrough();
      }
    }
    const authStates = ['login', 'register', 'payment', 'setPassword', 'bindOAuth', 'bindEmail', 'resetPassword'];
    return { state: authStates.includes(target) ? 'maxExpand' : target, authReturnState: null };
  }),

  setLyrics: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'lyrics') return prev;
    window.api?.expandWindowLyrics();
    window.api?.enableMousePassthrough();
    return { state: 'lyrics', authReturnState: null };
  }),

  setLyricsTranslation: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'lyricsTranslation') return prev;
    window.api?.expandWindowLyricsTranslation();
    window.api?.enableMousePassthrough();
    return { state: 'lyricsTranslation', authReturnState: null };
  }),

  setCaptureTranslate: (data) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'captureTranslate') return prev;
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
    return { state: 'captureTranslate' as const, captureTranslate: data, authReturnState: null };
  }),

  updateCaptureTranslate: (data) => set((prev) => ({
    captureTranslate: { ...prev.captureTranslate, ...data },
  })),

  setNotification: (data) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'notification') return prev;
    window.api?.expandWindowNotification();
    if (data.type !== 'cli-session-detected') playNotificationSoundOnce();
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

  setAgentVoiceInput: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'agentVoiceInput') return prev;
    window.api?.expandWindowLyrics();
    window.api?.enableMousePassthrough();
    return { state: 'agentVoiceInput' as const, authReturnState: null };
  }),

  setStt: (text?: string) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'stt') return prev;
    window.api?.expandWindowNotification();
    window.api?.disableMousePassthrough();
    return { state: 'stt' as const, sttText: text ?? '', authReturnState: null };
  }),

  setAgent: (prompt?: string) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'agent') return prev;
    window.api?.expandWindowNotification();
    window.api?.disableMousePassthrough();
    return { state: 'agent' as const, agentPrompt: prompt ?? prev.sttText ?? '', authReturnState: null };
  }),

  setCli: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'cli') return prev;
    window.api?.expandWindowNotification();
    window.api?.disableMousePassthrough();
    return { state: 'cli' as const, authReturnState: null };
  }),

  toggleUiStateLock: () => {
    const next = !get().uiStateLocked;
    set({ uiStateLocked: next });
    return next;
  },

  setHoverTab: (tab) => set({ hoverTab: tab }),
  setExpandTab: (tab) => set({ expandTab: tab }),
  setMaxExpandTab: (tab) => set({ maxExpandTab: tab }),
  setCliProvider: (provider) => {
    try {
      window.localStorage.setItem('eisland-cli-provider', provider);
    } catch {
      // 无持久化能力时仍保留当前渲染进程内的选择。
    }
    set({ cliProvider: provider });
  },
  setSpringAnimation: (enabled) => set({ springAnimation: enabled }),
  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
  setShapeMode: (mode) => set({ shapeMode: mode }),
});