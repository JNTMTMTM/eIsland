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
 * @file islandSlice.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as notificationSound from '../../../utils/audio/notificationSound';
import { createIslandSlice } from '../islandSlice';

type IslandState = ReturnType<typeof createIslandSlice>;

function createSliceState(creator: StateCreator<IslandState, [], [], IslandState>): { getState: () => IslandState } {
  let state = {} as IslandState;
  const setState = (updater: Partial<IslandState> | ((prev: IslandState) => Partial<IslandState>)) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  state = creator(setState as never, (() => state) as never, {} as never);
  return { getState: () => state };
}

describe('createIslandSlice', () => {
  const storage = new Map<string, string>();
  const api = {
    collapseWindow: vi.fn(),
    enableMousePassthrough: vi.fn(),
    expandWindow: vi.fn(),
    disableMousePassthrough: vi.fn(),
    expandWindowFull: vi.fn(),
    expandWindowSettings: vi.fn(),
    expandWindowLyrics: vi.fn(),
    expandWindowNotification: vi.fn(),
  };

  beforeEach(() => {
    storage.clear();
    Object.values(api).forEach((mock) => mock.mockReset());
    vi.spyOn(notificationSound, 'playNotificationSoundOnce').mockImplementation(() => {});

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { pathname: '/index.html' },
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
        api,
      },
      configurable: true,
      writable: true,
    });
  });

  it('keeps expanded state when setIdle is called without force', () => {
    const store = createSliceState(createIslandSlice);

    store.getState().setExpanded();
    store.getState().setIdle();

    expect(store.getState().state).toBe('expanded');
    expect(api.collapseWindow).not.toHaveBeenCalled();
  });

  it('forces idle transition when setIdle(true) is called', () => {
    const store = createSliceState(createIslandSlice);

    store.getState().setExpanded();
    store.getState().setIdle(true);

    expect(store.getState().state).toBe('idle');
    expect(api.collapseWindow).toHaveBeenCalledTimes(1);
    expect(api.enableMousePassthrough).toHaveBeenCalledTimes(1);
  });

  it('stores auth return state when entering login', () => {
    const store = createSliceState(createIslandSlice);

    store.getState().setHover();
    store.getState().setLogin();

    const state = store.getState();
    expect(state.state).toBe('login');
    expect(state.authReturnState).toBe('hover');
  });

  it('returns from auth and applies corresponding window action', () => {
    const store = createSliceState(createIslandSlice);

    store.getState().setHover();
    store.getState().setLogin();
    store.getState().returnFromAuth();

    const state = store.getState();
    expect(state.state).toBe('hover');
    expect(state.authReturnState).toBeNull();
    expect(api.expandWindow).toHaveBeenCalled();
    expect(api.disableMousePassthrough).toHaveBeenCalled();
  });

  it('persists the selected CLI provider', () => {
    const store = createSliceState(createIslandSlice);

    store.getState().setCliProvider('codex');

    expect(store.getState().cliProvider).toBe('codex');
    expect(storage.get('eisland-cli-provider')).toBe('codex');
  });

  it('plays sound and transitions to notification state', () => {
    const playSpy = vi.spyOn(notificationSound, 'playNotificationSoundOnce');
    const store = createSliceState(createIslandSlice);

    store.getState().setNotification({ title: 't', body: 'b' });

    expect(store.getState().state).toBe('notification');
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(api.expandWindowNotification).toHaveBeenCalledTimes(1);
  });
});
