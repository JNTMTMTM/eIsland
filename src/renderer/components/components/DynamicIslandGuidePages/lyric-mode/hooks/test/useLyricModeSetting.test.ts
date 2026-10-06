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
 * @file useLyricModeSetting.test.ts
 * @description 引导设置 Hook 的真实状态、初始化失败、外部通知与同步写入测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLyricModeSetting } from '../useLyricModeSetting';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../hooks/test/startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const get = vi.fn();
const set = vi.fn();
const unsubscribe = vi.fn();
let notify!: (channel: string, value: unknown) => void;
beforeEach(() => {
  resetHook();
  get.mockReset().mockResolvedValue(false);
  set.mockReset().mockResolvedValue(undefined);
  unsubscribe.mockReset();
  vi.stubGlobal('window', { api: {
    musicLyricsKaraokeGet: get,
    musicLyricsKaraokeSet: set,
    onSettingsChanged: (listener: typeof notify) => { notify = listener; return unsubscribe; },
  } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });
describe('guide lyric-mode settings', () => {
  it.each([false, true])('loads persisted value %s', async (value) => {
    get.mockResolvedValue(value);
    renderHook(useLyricModeSetting);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useLyricModeSetting).karaoke).toBe(value);
  });
  it('contains read and write rejection and retains optimistic state', async () => {
    get.mockRejectedValue(new Error('read failed'));
    set.mockRejectedValue(new Error('write failed'));
    renderHook(useLyricModeSetting);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useLyricModeSetting).karaoke).toBe(false);
    renderHook(useLyricModeSetting).setKaraoke(true);
    await settleHook();
    expect(set).toHaveBeenCalledWith(true);
    expect(renderHook(useLyricModeSetting).karaoke).toBe(true);
  });
  it('synchronizes matching settings events and removes subscriptions', async () => {
    renderHook(useLyricModeSetting);
    flushHookEffects();
    await settleHook();
    notify('other:channel', true);
    expect(renderHook(useLyricModeSetting).karaoke).toBe(false);
    notify('music:lyrics-karaoke', true);
    expect(renderHook(useLyricModeSetting).karaoke).toBe(true);
    notify('music:lyrics-karaoke', false);
    expect(renderHook(useLyricModeSetting).karaoke).toBe(false);
    notify('music:lyrics-karaoke', null);
    expect(renderHook(useLyricModeSetting).karaoke).toBe(false);
    unmountHook();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
