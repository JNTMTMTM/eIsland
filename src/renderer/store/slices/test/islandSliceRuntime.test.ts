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
 * @file islandSliceRuntime.test.ts
 * @description 真实 Zustand 灵动岛状态转换、UI 锁定、认证返回、独立窗口及叶 API 边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createIslandSlice } from '../islandSlice';
import installStorage from './sliceStorageFixture';
import type { IslandSlice, IslandState, NotificationData } from '../../types';
const sound = vi.hoisted(() => vi.fn<() => void>());
vi.mock('../../../utils/audio/notificationSound', () => ({
  playNotificationSoundOnce: sound
}));
const api = {
  collapseWindow: vi.fn<(delay: number) => void>(),
  expandWindow: vi.fn<(delay: number) => void>(),
  expandWindowFull: vi.fn<(delay: number) => void>(),
  expandWindowSettings: vi.fn<() => void>(),
  expandWindowLyrics: vi.fn<(delay: number) => void>(),
  expandWindowLyricsTranslation: vi.fn<(delay: number) => void>(),
  expandWindowNotification: vi.fn<(delay: number) => void>(),
  enableMousePassthrough: vi.fn<() => void>(),
  disableMousePassthrough: vi.fn<() => void>()
};
let storage: ReturnType<typeof installStorage>;
let pathname = '/index.html';
/** 安装局部窗口 API 叶边界。
 * @param enabled - 是否提供窗口 API
 */
function windowFixture(enabled = true): void {
  vi.stubGlobal('window', {
    localStorage: storage.storage,
    location: {
      pathname
    },
    ...(enabled ? {
      api
    } : {})
  });
}
/** 创建真实 Zustand 灵动岛切片。
 * @returns Zustand 状态 API
 */
function store() {
  return createStore<IslandSlice>()(createIslandSlice);
}
const password = {
  tempToken: 'token',
  suggestedUsername: 'name',
  email: 'email'
};
const oauth = {
  tempToken: 'token',
  username: 'name',
  email: 'email'
};
const email = {
  tempToken: 'token',
  suggestedUsername: 'name'
};
const notification: NotificationData = {
  title: 'Notice',
  body: 'Details',
  type: 'default'
};
const transitions: {
  state: IslandState;
  invoke: (slice: IslandSlice) => void;
  resize: keyof typeof api;
  passthrough: 'enable' | 'disable' | 'none';
}[] = [{
  state: 'idle',
  invoke: (slice) => slice.setIdle(true),
  resize: 'collapseWindow',
  passthrough: 'enable'
}, {
  state: 'hover',
  invoke: (slice) => slice.setHover(),
  resize: 'expandWindow',
  passthrough: 'disable'
}, {
  state: 'expanded',
  invoke: (slice) => slice.setExpanded(),
  resize: 'expandWindowFull',
  passthrough: 'disable'
}, {
  state: 'maxExpand',
  invoke: (slice) => slice.setMaxExpand(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'login',
  invoke: (slice) => slice.setLogin(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'register',
  invoke: (slice) => slice.setRegister(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'payment',
  invoke: (slice) => slice.setPayment(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'setPassword',
  invoke: (slice) => slice.setSetPassword(password),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'bindOAuth',
  invoke: (slice) => slice.setBindOAuth(oauth),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'bindEmail',
  invoke: (slice) => slice.setBindEmail(email),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'musicProvidersLogin',
  invoke: (slice) => slice.setMusicProvidersLogin(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'lyrics',
  invoke: (slice) => slice.setLyrics(),
  resize: 'expandWindowLyrics',
  passthrough: 'enable'
}, {
  state: 'lyricsTranslation',
  invoke: (slice) => slice.setLyricsTranslation(),
  resize: 'expandWindowLyricsTranslation',
  passthrough: 'enable'
}, {
  state: 'notification',
  invoke: (slice) => slice.setNotification(notification),
  resize: 'expandWindowNotification',
  passthrough: 'none'
}, {
  state: 'guide',
  invoke: (slice) => slice.setGuide(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'announcement',
  invoke: (slice) => slice.setAnnouncement(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'questionnaire',
  invoke: (slice) => slice.setQuestionnaire(),
  resize: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'agentVoiceInput',
  invoke: (slice) => slice.setAgentVoiceInput(),
  resize: 'expandWindowLyrics',
  passthrough: 'enable'
}, {
  state: 'stt',
  invoke: (slice) => slice.setStt('Speech'),
  resize: 'expandWindowNotification',
  passthrough: 'disable'
}, {
  state: 'agent',
  invoke: (slice) => slice.setAgent('Prompt'),
  resize: 'expandWindowNotification',
  passthrough: 'disable'
}, {
  state: 'cli',
  invoke: (slice) => slice.setCli(),
  resize: 'expandWindowNotification',
  passthrough: 'disable'
}];
const protectedStates: IslandState[] = ['expanded', 'maxExpand', 'guide', 'login', 'register', 'resetPassword', 'setPassword', 'bindOAuth', 'bindEmail', 'payment', 'announcement', 'questionnaire', 'musicProvidersLogin'];
const authTransitions = transitions.filter((entry) => ['login', 'register', 'payment', 'setPassword', 'bindOAuth', 'bindEmail', 'musicProvidersLogin'].includes(entry.state));
const expectedAuthReturnStates: Record<string, IslandState[]> = {
  login: ['hover', 'hover', 'hover', 'setPassword', 'bindOAuth', 'bindEmail', 'musicProvidersLogin'],
  register: ['hover', 'hover', 'hover', 'setPassword', 'bindOAuth', 'bindEmail', 'musicProvidersLogin'],
  payment: ['hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'musicProvidersLogin'],
  setPassword: ['hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'musicProvidersLogin'],
  bindOAuth: ['hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'musicProvidersLogin'],
  bindEmail: ['hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'musicProvidersLogin'],
  musicProvidersLogin: ['hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'hover']
};
const authOrigins: IslandState[] = ['login', 'register', 'payment', 'setPassword', 'bindOAuth', 'bindEmail', 'musicProvidersLogin'];
const authReturns: {
  state: IslandState;
  method?: keyof typeof api;
  passthrough?: 'enable' | 'disable';
  result?: IslandState;
}[] = [{
  state: 'idle',
  method: 'collapseWindow',
  passthrough: 'enable'
}, {
  state: 'hover',
  method: 'expandWindow',
  passthrough: 'disable'
}, {
  state: 'expanded',
  method: 'expandWindowFull',
  passthrough: 'disable'
}, {
  state: 'maxExpand',
  method: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'guide',
  method: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'login',
  method: 'expandWindowSettings',
  passthrough: 'disable',
  result: 'maxExpand'
}, {
  state: 'register',
  method: 'expandWindowSettings',
  passthrough: 'disable',
  result: 'maxExpand'
}, {
  state: 'payment',
  method: 'expandWindowSettings',
  passthrough: 'disable',
  result: 'maxExpand'
}, {
  state: 'announcement',
  method: 'expandWindowSettings',
  passthrough: 'disable'
}, {
  state: 'musicProvidersLogin',
  method: 'expandWindowSettings',
  passthrough: 'disable',
  result: 'maxExpand'
}, {
  state: 'lyrics',
  method: 'expandWindowLyrics',
  passthrough: 'enable'
}, {
  state: 'agentVoiceInput',
  method: 'expandWindowLyrics',
  passthrough: 'enable'
}, {
  state: 'lyricsTranslation',
  method: 'expandWindowLyricsTranslation',
  passthrough: 'enable'
}, {
  state: 'notification',
  method: 'expandWindowNotification',
  passthrough: 'disable'
}, {
  state: 'agent',
  method: 'expandWindowNotification',
  passthrough: 'disable'
}, {
  state: 'stt',
  method: 'expandWindowNotification',
  passthrough: 'disable'
}, {
  state: 'resetPassword',
  result: 'maxExpand'
}, {
  state: 'setPassword',
  result: 'maxExpand'
}, {
  state: 'bindOAuth',
  result: 'maxExpand'
}, {
  state: 'bindEmail',
  result: 'maxExpand'
}, {
  state: 'cli'
}, {
  state: 'questionnaire'
}];
beforeEach(() => {
  storage = installStorage();
  pathname = '/index.html';
  windowFixture();
  Object.values(api).forEach((method) => method.mockClear());
  sound.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Island slice window transitions and lock contract', () => {
  it.each(transitions)('opens $state with its corresponding window API and pointer mode', ({
    state,
    invoke,
    resize,
    passthrough
  }) => {
    const island = store();
    invoke(island.getState());
    expect(island.getState().state).toBe(state);
    expect(api[resize]).toHaveBeenCalledOnce();
    if (passthrough === 'enable') expect(api.enableMousePassthrough).toHaveBeenCalledOnce();
    if (passthrough === 'disable') expect(api.disableMousePassthrough).toHaveBeenCalledOnce();
    if (passthrough === 'none') expect(api.disableMousePassthrough).not.toHaveBeenCalled();
  });
  it.each(transitions)('blocks locked transition to $state but allows re-entering the current state', ({
    state,
    invoke,
    resize
  }) => {
    const island = store();
    island.setState({
      state: state === 'idle' ? 'hover' : 'idle',
      uiStateLocked: true
    });
    const previous = island.getState();
    invoke(previous);
    expect(island.getState()).toBe(previous);
    expect(api[resize]).not.toHaveBeenCalled();
    island.setState({
      state
    });
    invoke(island.getState());
    expect(api[resize]).toHaveBeenCalledOnce();
    expect(island.getState().state).toBe(state);
  });
  it.each(transitions)('runs $state transition when the optional window API is absent', ({
    state,
    invoke
  }) => {
    windowFixture(false);
    const island = store();
    invoke(island.getState());
    expect(island.getState().state).toBe(state);
    expect(Object.values(api).every((method) => method.mock.calls.length === 0)).toBe(true);
  });
  it.each(protectedStates)('preserves $state on idle request without force', (state) => {
    const island = store();
    island.setState({
      state
    });
    island.getState().setIdle();
    expect(island.getState().state).toBe(state);
    expect(api.collapseWindow).not.toHaveBeenCalled();
    island.getState().setIdle(true);
    expect(island.getState().state).toBe('idle');
  });
  it('permits ordinary idle requests and clears auth return state', () => {
    const island = store();
    island.getState().setHover();
    island.setState({
      authReturnState: 'hover'
    });
    island.getState().setIdle();
    expect(island.getState().state).toBe('idle');
    expect(island.getState().authReturnState).toBeNull();
    expect(api.enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('toggles the UI lock and refuses authentication return while locked', () => {
    const island = store();
    expect(island.getState().toggleUiStateLock()).toBe(true);
    island.setState({
      state: 'login',
      authReturnState: 'hover'
    });
    const previous = island.getState();
    island.getState().returnFromAuth();
    expect(island.getState()).toBe(previous);
    expect(island.getState().toggleUiStateLock()).toBe(false);
    island.getState().returnFromAuth();
    expect(island.getState().state).toBe('hover');
  });
  it('preserves notification content and suppresses sound for detected CLI sessions', () => {
    const island = store();
    island.getState().setNotification(notification);
    expect(island.getState().notification).toEqual(notification);
    expect(sound).toHaveBeenCalledOnce();
    island.getState().setNotification({
      title: 'CLI',
      body: 'ready',
      type: 'cli-session-detected'
    });
    expect(sound).toHaveBeenCalledOnce();
  });
  it('handles STT and agent optional prompts using the preceding speech text', () => {
    const island = store();
    island.getState().setStt();
    expect(island.getState().sttText).toBe('');
    island.getState().setStt('speech');
    island.getState().setAgent();
    expect(island.getState().agentPrompt).toBe('speech');
    island.getState().setAgent('direct');
    expect(island.getState().agentPrompt).toBe('direct');
  });
  it('uses the final empty prompt fallback after an external JSON patch supplies null speech', () => {
    const island = store();
    const externalPatch: unknown = JSON.parse('{"sttText":null}');
    Reflect.apply(island.setState, undefined, [externalPatch]);
    island.getState().setAgent();
    expect(island.getState().agentPrompt).toBe('');
    expect(island.getState().state).toBe('agent');
  });
});
describe('Island slice authentication and standalone contract', () => {
  it.each(authTransitions)('records integrated and standalone auth return destinations for $state', ({
    state,
    invoke
  }) => {
    const integrated = store();
    integrated.getState().setExpanded();
    invoke(integrated.getState());
    expect(integrated.getState().authReturnState).toBe('expanded');
    expect(integrated.getState().state).toBe(state);
    pathname = '/DynamicIslandStandalone.html';
    windowFixture();
    Object.values(api).forEach((method) => method.mockClear());
    const standalone = store();
    standalone.getState().setExpanded();
    Object.values(api).forEach((method) => method.mockClear());
    invoke(standalone.getState());
    expect(standalone.getState().authReturnState).toBe('maxExpand');
    expect(Object.values(api).every((method) => method.mock.calls.length === 0)).toBe(true);
    standalone.getState().returnFromAuth();
    expect(standalone.getState().state).toBe('maxExpand');
  });
  it.each(authTransitions)('keeps the existing earlier authentication origin when navigating to $state', ({
    state,
    invoke
  }) => {
    const island = store();
    authOrigins.forEach((origin, index) => {
      island.setState({
        state: origin,
        authReturnState: 'hover'
      });
      invoke(island.getState());
      expect(island.getState().authReturnState).toBe(expectedAuthReturnStates[state][index]);
    });
  });
  it.each(authReturns)('returns to $state and performs the matching integrated window operation', ({
    state,
    method,
    passthrough,
    result
  }) => {
    const island = store();
    island.setState({
      state: 'login',
      authReturnState: state
    });
    island.getState().returnFromAuth();
    expect(island.getState().state).toBe(result || state);
    expect(island.getState().authReturnState).toBeNull();
    if (method) expect(api[method]).toHaveBeenCalledOnce();else expect(Object.values(api).every((mock) => mock.mock.calls.length === 0)).toBe(true);
    if (passthrough === 'enable') expect(api.enableMousePassthrough).toHaveBeenCalledOnce();
    if (passthrough === 'disable') expect(api.disableMousePassthrough).toHaveBeenCalledOnce();
  });
  it.each(authReturns)('returns to $state without an optional window API', ({
    state,
    result
  }) => {
    windowFixture(false);
    const island = store();
    island.setState({
      state: 'login',
      authReturnState: state
    });
    island.getState().returnFromAuth();
    expect(island.getState().state).toBe(result || state);
  });
  it('defaults the auth return target and preserves explicit contexts and selected music provider', () => {
    const island = store();
    island.getState().setPayment({
      type: 'recharge', amountFen: 1000
    });
    expect(island.getState().paymentContext).toEqual({
      type: 'recharge', amountFen: 1000
    });
    island.getState().setSetPassword(password);
    expect(island.getState().setPasswordContext).toEqual(password);
    island.getState().setBindOAuth(oauth);
    expect(island.getState().bindOAuthContext).toEqual(oauth);
    island.getState().setBindEmail(email);
    expect(island.getState().bindEmailContext).toEqual(email);
    island.getState().setMusicProvidersLogin('qishui');
    expect(island.getState().musicProviderLogin).toBe('qishui');
    island.setState({
      authReturnState: null
    });
    island.getState().returnFromAuth();
    expect(island.getState().state).toBe('maxExpand');
  });
  it('handles unavailable location information without treating the renderer as standalone', () => {
    vi.stubGlobal('window', {
      api,
      localStorage: storage.storage
    });
    const island = store();
    island.getState().setLogin();
    expect(island.getState().authReturnState).toBe('idle');
    expect(api.expandWindowSettings).toHaveBeenCalledOnce();
    const location = {
      get pathname(): string {
        throw new Error('location unavailable');
      }
    };
    vi.stubGlobal('window', {
      api,
      location,
      localStorage: storage.storage
    });
    island.getState().setRegister();
    expect(api.expandWindowSettings).toHaveBeenCalledTimes(2);
  });
});
describe('Island slice tab, appearance and persistence settings', () => {
  it.each(['claude', 'codex'] as const)('reads and writes CLI provider %s', (provider) => {
    storage.values.set('eisland-cli-provider', provider);
    const island = store();
    expect(island.getState().cliProvider).toBe(provider);
    island.getState().setCliProvider(provider);
    expect(storage.set).toHaveBeenCalledWith('eisland-cli-provider', provider);
    storage.get.mockImplementation(() => {
      throw new Error('denied');
    });
    expect(store().getState().cliProvider).toBe('claude');
    storage.set.mockImplementation(() => {
      throw new Error('full');
    });
    island.getState().setCliProvider('codex');
    expect(island.getState().cliProvider).toBe('codex');
  });
  it('updates tabs, launcher and animation appearance while retaining unrelated state', () => {
    const island = store();
    island.getState().setHoverTab('weather');
    island.getState().setExpandTab('song');
    island.getState().setMaxExpandTab('calendar');
    expect(island.getState()).toMatchObject({
      hoverTab: 'weather',
      expandTab: 'song',
      maxExpandTab: 'calendar',
      maxExpandLauncherVisible: false
    });
    island.getState().showMaxExpandLauncher();
    island.getState().setSpringAnimation(false);
    island.getState().setAnimationSpeed('slow');
    island.getState().setShapeMode('pill');
    expect(island.getState()).toMatchObject({
      maxExpandLauncherVisible: true,
      springAnimation: false,
      animationSpeed: 'slow',
      shapeMode: 'pill',
      state: 'idle'
    });
  });
});
