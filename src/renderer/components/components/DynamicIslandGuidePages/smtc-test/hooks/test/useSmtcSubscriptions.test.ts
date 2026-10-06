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
 * @file useSmtcSubscriptions.test.ts
 * @description SMTC 真实状态订阅 Hook、重复消费者清理及归一化强调色边界测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSmtcTest } from '../useSmtcTest';
import { useSmtcAccentColor } from '../useSmtcAccentColor';
import { runtime, notify } from '../../utils/smtcStore';
import { dispose, handleNowPlaying } from '../../utils/smtcActions';
import { DEFAULT_ACCENT_COLOR } from '../../../../DynamicIslandSharedWaveEffect/utils/constants';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../hooks/test/startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const subscribe = vi.fn();
const unsubscribe = vi.fn();
beforeEach(() => {
  dispose();
  runtime.listeners.clear();
  resetHook();
  subscribe.mockReset().mockReturnValue(unsubscribe);
  unsubscribe.mockReset();
  vi.stubGlobal('window', { api: { mediaCurrentInfoGet: () => new Promise(() => {}), onNowPlayingInfo: subscribe } });
});
afterEach(() => { unmountHook(); dispose(); vi.unstubAllGlobals(); });
describe('real SMTC hook consumers', () => {
  it('shares native subscriptions and disposes when the last media consumer leaves', async () => {
    const pair = (): [ReturnType<typeof useSmtcTest>, ReturnType<typeof useSmtcTest>] => [useSmtcTest(), useSmtcTest()];
    expect(renderHook(pair).map((item) => item.status)).toEqual(['loading', 'loading']);
    flushHookEffects();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(runtime.listeners.size).toBe(2);
    await handleNowPlaying(null);
    expect(renderHook(pair).map((item) => item.status)).toEqual(['no-media', 'no-media']);
    unmountHook();
    expect(runtime.listeners.size).toBe(0);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(runtime.initialized).toBe(false);
  });
  it.each([[0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]] as Array<[number, number, number]>)('normalizes RGB %j', (...rgb) => {
    renderHook(useSmtcAccentColor);
    flushHookEffects();
    expect(renderHook(useSmtcAccentColor)).toEqual(DEFAULT_ACCENT_COLOR);
    runtime.dominantColor = rgb;
    notify();
    expect(renderHook(useSmtcAccentColor)).toEqual(rgb.some((value) => value !== 0) ? rgb.map((value) => value / 255) : DEFAULT_ACCENT_COLOR);
    unmountHook();
    expect(runtime.listeners.size).toBe(0);
  });
});
