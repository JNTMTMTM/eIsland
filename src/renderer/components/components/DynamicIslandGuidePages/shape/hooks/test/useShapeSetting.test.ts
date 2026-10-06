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
 * @file useShapeSetting.test.ts
 * @description 引导设置 Hook 的真实状态、初始化失败、外部通知与同步写入测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShapeSetting } from '../useShapeSetting';
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
  get.mockReset().mockResolvedValue('notch');
  set.mockReset().mockResolvedValue(undefined);
  unsubscribe.mockReset();
  vi.stubGlobal('window', { api: {
    shapeModeGet: get,
    shapeModeSet: set,
    onSettingsChanged: (listener: typeof notify) => { notify = listener; return unsubscribe; },
  } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });
describe('guide shape settings', () => {
  it.each(['notch', 'pill', 'invalid'])('loads persisted value %s', async (value) => {
    get.mockResolvedValue(value);
    renderHook(useShapeSetting);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useShapeSetting).mode).toBe(value === 'pill' ? 'pill' : 'notch');
  });
  it('contains read and write rejection and retains optimistic state', async () => {
    get.mockRejectedValue(new Error('read failed'));
    set.mockRejectedValue(new Error('write failed'));
    renderHook(useShapeSetting);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useShapeSetting).mode).toBe('notch');
    renderHook(useShapeSetting).setMode('pill');
    await settleHook();
    expect(set).toHaveBeenCalledWith('pill');
    expect(renderHook(useShapeSetting).mode).toBe('pill');
  });
  it('synchronizes matching settings events and removes subscriptions', async () => {
    renderHook(useShapeSetting);
    flushHookEffects();
    await settleHook();
    notify('other:channel', 'pill');
    expect(renderHook(useShapeSetting).mode).toBe('notch');
    notify('island:shape-mode', 'pill');
    expect(renderHook(useShapeSetting).mode).toBe('pill');
    notify('island:shape-mode', 'notch');
    expect(renderHook(useShapeSetting).mode).toBe('notch');
    notify('island:shape-mode', null);
    expect(renderHook(useShapeSetting).mode).toBe('notch');
    unmountHook();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
