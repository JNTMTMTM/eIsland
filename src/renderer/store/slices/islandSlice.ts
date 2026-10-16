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

import { emptyNotification } from '../constants/defaults';
import { getIslandMorphDuration } from '../constants/islandTransition';
import { playNotificationSoundOnce } from '../../utils/audio/notificationSound';
import { beginIslandWindowTransition } from '../../utils/islandWindowTransition';
import type { StateCreator } from 'zustand';
import type { IslandSlice } from '../types';

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
  musicProviderLogin: 'qishui',
  hoverTab: 'time',
  expandTab: 'overview',
  maxExpandTab: 'todo',
  maxExpandAppModeEnabled: false,
  maxExpandLauncherVisible: true,
  cliProvider: readCliProvider(),
  notification: emptyNotification,
  sttText: '',
  agentPrompt: '',
  springAnimation: true,
  animationSpeed: 'medium' as const,
  shapeMode: 'notch' as const,

  setIdle: (force?: boolean) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'idle') return prev;
    if (!force && (prev.state === 'expanded' || prev.state === 'maxExpand' || prev.state === 'guide' || prev.state === 'login' || prev.state === 'register' || prev.state === 'resetPassword' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail' || prev.state === 'payment' || prev.state === 'announcement' || prev.state === 'questionnaire' || prev.state === 'musicProvidersLogin')) return prev;
    // 每次切换都传完整保护时长；快速反向切换时，原生画布可能仍比 prev.state 大。
    beginIslandWindowTransition(prev.state, 'idle');
    window.api?.collapseWindow(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.enableMousePassthrough();
    return { state: 'idle' as const, authReturnState: null };
  }),

  setHover: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'hover') return prev;
    beginIslandWindowTransition(prev.state, 'hover');
    window.api?.expandWindow(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'hover', authReturnState: null };
  }),

  setExpanded: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'expanded') return prev;
    beginIslandWindowTransition(prev.state, 'expanded');
    window.api?.expandWindowFull(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'expanded', authReturnState: null };
  }),

  setMaxExpand: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'maxExpand') return prev;
    beginIslandWindowTransition(prev.state, 'maxExpand');
    window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'maxExpand', authReturnState: null };
  }),

  setLogin: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'login') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      beginIslandWindowTransition(prev.state, 'login');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
      beginIslandWindowTransition(prev.state, 'register');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
      beginIslandWindowTransition(prev.state, 'payment');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
      beginIslandWindowTransition(prev.state, 'setPassword');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
      beginIslandWindowTransition(prev.state, 'bindOAuth');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
      beginIslandWindowTransition(prev.state, 'bindEmail');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'bindEmail' as never, authReturnState: nextAuthReturnState, bindEmailContext: context };
  }),

  setMusicProvidersLogin: (provider = 'qishui') => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'musicProvidersLogin') return prev;
    const standalone = isStandaloneRenderer();
    if (!standalone) {
      beginIslandWindowTransition(prev.state, 'musicProvidersLogin');
      window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
      window.api?.disableMousePassthrough();
    }
    const nextAuthReturnState = (prev.state === 'login' || prev.state === 'register' || prev.state === 'payment' || prev.state === 'setPassword' || prev.state === 'bindOAuth' || prev.state === 'bindEmail' || prev.state === 'musicProvidersLogin')
      ? prev.authReturnState
      : (standalone ? 'maxExpand' : prev.state);
    return { state: 'musicProvidersLogin' as never, authReturnState: nextAuthReturnState, musicProviderLogin: provider };
  }),

  returnFromAuth: () => set((prev) => {
    if (prev.uiStateLocked) return prev;
    const standalone = isStandaloneRenderer();
    const authStates = ['login', 'register', 'payment', 'setPassword', 'bindOAuth', 'bindEmail', 'resetPassword', 'musicProvidersLogin'];
    const returnState = prev.authReturnState ?? 'maxExpand';
    const target = authStates.includes(returnState) ? 'maxExpand' : returnState;

    if (!standalone) {
      beginIslandWindowTransition(prev.state, target);
      if (target === 'idle') {
        window.api?.collapseWindow(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.enableMousePassthrough();
      } else if (target === 'hover') {
        window.api?.expandWindow(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      } else if (target === 'expanded') {
        window.api?.expandWindowFull(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      } else if (target === 'maxExpand' || target === 'guide' || target === 'announcement' || target === 'questionnaire') {
        window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      } else if (target === 'lyrics' || target === 'agentVoiceInput' || target === 'lyricsTranslation') {
        if (target === 'lyricsTranslation') {
          window.api?.expandWindowLyricsTranslation(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        } else {
          window.api?.expandWindowLyrics(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        }
        window.api?.enableMousePassthrough();
      } else if (target === 'notification' || target === 'agent' || target === 'stt' || target === 'cli') {
        window.api?.expandWindowNotification(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
        window.api?.disableMousePassthrough();
      }
    }
    return { state: target, authReturnState: null };
  }),

  setLyrics: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'lyrics') return prev;
    beginIslandWindowTransition(prev.state, 'lyrics');
    window.api?.expandWindowLyrics(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.enableMousePassthrough();
    return { state: 'lyrics', authReturnState: null };
  }),

  setLyricsTranslation: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'lyricsTranslation') return prev;
    beginIslandWindowTransition(prev.state, 'lyricsTranslation');
    window.api?.expandWindowLyricsTranslation(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.enableMousePassthrough();
    return { state: 'lyricsTranslation', authReturnState: null };
  }),

  setNotification: (data) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'notification') return prev;
    beginIslandWindowTransition(prev.state, 'notification');
    window.api?.expandWindowNotification(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    if (data.type !== 'cli-session-detected') playNotificationSoundOnce();
    return { state: 'notification', notification: data, authReturnState: null };
  }),

  setGuide: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'guide') return prev;
    beginIslandWindowTransition(prev.state, 'guide');
    window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'guide' as const, authReturnState: null };
  }),

  setAnnouncement: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'announcement') return prev;
    beginIslandWindowTransition(prev.state, 'announcement');
    window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'announcement' as const, authReturnState: null };
  }),

  setQuestionnaire: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'questionnaire') return prev;
    beginIslandWindowTransition(prev.state, 'questionnaire');
    window.api?.expandWindowSettings(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'questionnaire' as const, authReturnState: null };
  }),

  setAgentVoiceInput: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'agentVoiceInput') return prev;
    beginIslandWindowTransition(prev.state, 'agentVoiceInput');
    window.api?.expandWindowLyrics(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.enableMousePassthrough();
    return { state: 'agentVoiceInput' as const, authReturnState: null };
  }),

  setStt: (text?: string) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'stt') return prev;
    beginIslandWindowTransition(prev.state, 'stt');
    window.api?.expandWindowNotification(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'stt' as const, sttText: text ?? '', authReturnState: null };
  }),

  setAgent: (prompt?: string) => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'agent') return prev;
    beginIslandWindowTransition(prev.state, 'agent');
    window.api?.expandWindowNotification(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
    window.api?.disableMousePassthrough();
    return { state: 'agent' as const, agentPrompt: prompt ?? prev.sttText ?? '', authReturnState: null };
  }),

  setCli: () => set((prev) => {
    if (prev.uiStateLocked && prev.state !== 'cli') return prev;
    beginIslandWindowTransition(prev.state, 'cli');
    window.api?.expandWindowNotification(getIslandMorphDuration(prev.animationSpeed, prev.springAnimation));
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
  setMaxExpandTab: (tab) => set({ maxExpandTab: tab, maxExpandLauncherVisible: false }),
  showMaxExpandLauncher: () => set({ maxExpandLauncherVisible: true }),
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
