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
 * @file weatherTimerRuntime.test.ts
 * @description 天气真实供应商网络失败持久化保护与计时器部分补丁边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createTimerSlice } from '../timerSlice';
import { createWeatherSlice } from '../weatherSlice';

vi.hoisted(() => { vi.stubGlobal('window', { location: { hostname: 'app' } }); });
const netFetch = vi.fn<Window['api']['netFetch']>();
const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();

beforeEach(() => {
  netFetch.mockReset();
  netFetch.mockRejectedValue(new Error('offline'));
  getItem.mockReturnValue(null);
  setItem.mockImplementation(() => undefined);
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', { location: { hostname: 'app' }, api: { netFetch } });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('真实天气与计时器切片边界', () => {
  it('所有真实天气供应商经原生网络拒绝后保留已有天气及持久化缓存', async () => {
    const store = createStore(createWeatherSlice);
    const before = store.getState().weather;
    await expect(store.getState().fetchWeatherData({ latitude: 31, longitude: 121 })).resolves.toBeUndefined();
    expect(netFetch).toHaveBeenCalledTimes(2);
    expect(store.getState().weather).toBe(before);
    expect(setItem).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[Weather] 获取天气数据失败:', expect.any(Error));
  });
  it('计时器空补丁保留倒计时，显式零秒仍生效', () => {
    const store = createStore(createTimerSlice);
    store.getState().setTimerData({ remainingSeconds: 42 });
    store.getState().setTimerData({});
    expect(store.getState().timerData.remainingSeconds).toBe(42);
    store.getState().setTimerData({ remainingSeconds: 0 });
    expect(store.getState().timerData.remainingSeconds).toBe(0);
  });
});
