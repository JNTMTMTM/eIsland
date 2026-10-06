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
 * @file storagePersistence.test.ts
 * @description 公共天气与位置缓存、输入归一化、主存储迁移和持久化失败回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hydrateWeatherLocationConfigFromStore,
  loadLocationFromStorage,
  loadWeatherFromStorage,
  loadWeatherLocationConfig,
  saveLocationToStorage,
  saveWeatherToStorage,
  saveWeatherLocationConfig,
} from '../storage';

const local = new Map<string, string>();
const getItem = vi.fn<(key: string) => string | null>();
const setItem = vi.fn<(key: string, value: string) => void>();
const storeRead = vi.fn<(key: string) => Promise<unknown>>();
const storeWrite = vi.fn<(key: string, value: unknown) => Promise<void>>();
const locationKey = 'island_weather_location_config';
const storeKey = 'weather-location-config';
const defaultConfig = { priority: 'ip', customLocation: null };
const normalizedConfig = { priority: 'custom', customLocation: { latitude: 1, longitude: 2, city: '' } };
const location = { latitude: 1, longitude: 2, city: 'City', country: 'Country', regionName: 'Region' };

beforeEach(() => {
  local.clear();
  getItem.mockReset().mockImplementation((key) => local.get(key) ?? null);
  setItem.mockReset().mockImplementation((key, value) => { local.set(key, value); });
  storeRead.mockReset().mockResolvedValue(null);
  storeWrite.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', { api: { storeRead, storeWrite } });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('weather location normalization through public persistence', () => {
  it.each([null, 0, false, 'damaged', [], {}])('normalizes a non-configuration JSON value %j', (value) => {
    local.set(locationKey, JSON.stringify(value));
    expect(loadWeatherLocationConfig()).toEqual(defaultConfig);
  });
  it.each([null, false, 5, 'invalid', {}, { latitude: null, longitude: 1 }, { latitude: 1, longitude: false }, { latitude: 'Infinity', longitude: '2' }, { latitude: '1', longitude: 'NaN' }])('rejects unusable custom coordinates %j', (customLocation) => {
    local.set(locationKey, JSON.stringify({ customLocation, priority: 'custom' }));
    expect(loadWeatherLocationConfig()).toEqual({ priority: 'custom', customLocation: null });
  });
  it('accepts finite numeric strings and preserves optional region metadata', () => {
    local.set(locationKey, JSON.stringify({ priority: 'custom', customLocation: { latitude: ' 1 ', longitude: '2', city: 'City', countryCode: ' us ', country: 'Country', regionName: 'Region', regionCode: 'CA' } }));
    expect(loadWeatherLocationConfig()).toEqual({ priority: 'custom', customLocation: { ...location, countryCode: 'US', regionCode: 'CA' } });
  });
  it('defaults non-string city and country metadata without adding invalid region codes', () => {
    local.set(locationKey, JSON.stringify({ priority: 'unexpected', customLocation: { latitude: 1, longitude: 2, city: 1, countryCode: 'us', country: null, regionName: [], regionCode: 3 } }));
    expect(loadWeatherLocationConfig()).toEqual({ priority: 'ip', customLocation: { latitude: 1, longitude: 2, city: '', countryCode: 'US', country: '', regionName: '' } });
  });
  it.each([undefined, 'not-json'])('returns defaults for missing or damaged local configuration %s', (raw) => {
    if (raw !== undefined) local.set(locationKey, raw);
    expect(loadWeatherLocationConfig()).toEqual(defaultConfig);
  });
  it('returns defaults when storage reads throw', () => {
    getItem.mockImplementation(() => { throw new Error('storage disabled'); });
    expect(loadWeatherLocationConfig()).toEqual(defaultConfig);
  });
  it('normalizes direct non-finite numeric coordinates before writing', async () => {
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: Infinity, longitude: 2 } });
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: 1, longitude: NaN } });
    await Promise.resolve();
    expect(storeWrite).toHaveBeenNthCalledWith(1, storeKey, { priority: 'custom', customLocation: null });
    expect(storeWrite).toHaveBeenNthCalledWith(2, storeKey, { priority: 'custom', customLocation: null });
  });
  it('still writes to the main store when the local write fails and consumes bridge rejection', async () => {
    setItem.mockImplementation(() => { throw new Error('quota'); });
    storeWrite.mockRejectedValue(new Error('bridge write'));
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: 1, longitude: 2 } });
    await Promise.resolve();
    expect(storeWrite).toHaveBeenCalledWith(storeKey, normalizedConfig);
  });
  it.each([{}, { api: {} }])('allows configuration saves without an optional bridge %j', (windowValue) => {
    vi.stubGlobal('window', windowValue);
    saveWeatherLocationConfig({ priority: 'ip', customLocation: null });
    expect(local.get(locationKey)).toBe(JSON.stringify(defaultConfig));
  });
});

describe('weather location main-store hydration and legacy migration', () => {
  it.each([{}, { api: {} }, { api: { storeRead } }, { api: { storeWrite } }])('returns without attempting partial bridges %j', async (windowValue) => {
    vi.stubGlobal('window', windowValue);
    await hydrateWeatherLocationConfigFromStore();
    expect(getItem).not.toHaveBeenCalled();
    expect(storeRead).not.toHaveBeenCalled();
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it('hydrates and normalizes the authoritative main-store value', async () => {
    local.set(locationKey, 'obsolete');
    storeRead.mockResolvedValue({ priority: 'custom', customLocation: { latitude: '1', longitude: '2' } });
    await hydrateWeatherLocationConfigFromStore();
    expect(storeRead).toHaveBeenCalledWith(storeKey);
    expect(local.get(locationKey)).toBe(JSON.stringify(normalizedConfig));
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it('does not fall back to legacy migration when an authoritative cache write fails', async () => {
    storeRead.mockResolvedValue({ priority: 'ip', customLocation: null });
    setItem.mockImplementation(() => { throw new Error('quota'); });
    await hydrateWeatherLocationConfigFromStore();
    expect(getItem).not.toHaveBeenCalled();
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it.each([null, undefined])('migrates local configuration when the main store contains %s', async (value) => {
    storeRead.mockResolvedValue(value);
    local.set(locationKey, JSON.stringify({ priority: 'custom', customLocation: { latitude: '1', longitude: '2' } }));
    await hydrateWeatherLocationConfigFromStore();
    expect(storeWrite).toHaveBeenCalledWith(storeKey, normalizedConfig);
  });
  it('migrates the local configuration after a failed main-store read', async () => {
    storeRead.mockRejectedValue(new Error('bridge read'));
    local.set(locationKey, JSON.stringify(defaultConfig));
    await hydrateWeatherLocationConfigFromStore();
    expect(storeWrite).toHaveBeenCalledWith(storeKey, defaultConfig);
  });
  it.each([undefined, 'not-json'])('ignores absent or damaged legacy configuration %s', async (value) => {
    if (value !== undefined) local.set(locationKey, value);
    await hydrateWeatherLocationConfigFromStore();
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it('consumes local-read and migration-write failures', async () => {
    getItem.mockImplementationOnce(() => { throw new Error('disabled'); });
    await hydrateWeatherLocationConfigFromStore();
    expect(storeWrite).not.toHaveBeenCalled();
    local.set(locationKey, JSON.stringify(defaultConfig));
    storeWrite.mockRejectedValue(new Error('write'));
    await hydrateWeatherLocationConfigFromStore();
    expect(storeWrite).toHaveBeenCalledWith(storeKey, defaultConfig);
  });
});

describe('public weather and location cache', () => {
  it('returns an empty weather snapshot and persists a successful updated snapshot', () => {
    const weather = loadWeatherFromStorage();
    expect(weather.temperature).toBe(0);
    expect(weather.description).toBe('');
    expect(weather.forecast).toHaveLength(2);
    expect(weather.forecast.map((day) => day.temperature)).toEqual([0, 0]);
    const updated = { ...weather, temperature: 24, description: 'sunny' };
    saveWeatherToStorage(updated);
    expect(setItem).toHaveBeenCalledWith('island_weather', JSON.stringify(updated));
    expect(loadWeatherFromStorage()).toEqual(updated);
    expect(console.log).toHaveBeenCalledWith('[Weather] 天气数据已保存到本地存储');
  });
  it('returns the fallback weather after malformed JSON or denied reads', () => {
    local.set('island_weather', 'not-json');
    expect(loadWeatherFromStorage().temperature).toBe(0);
    getItem.mockImplementation(() => { throw new Error('disabled'); });
    expect(loadWeatherFromStorage().forecast).toHaveLength(2);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
  it('logs a failed weather write without throwing', () => {
    const weather = loadWeatherFromStorage();
    const error = new Error('quota');
    setItem.mockImplementation(() => { throw error; });
    expect(() => saveWeatherToStorage(weather)).not.toThrow();
    expect(console.error).toHaveBeenCalledWith('[Weather] 保存天气数据到本地存储失败:', error);
  });
  it('round trips location fields without losing metadata', () => {
    expect(loadLocationFromStorage()).toBeNull();
    saveLocationToStorage(location);
    expect(setItem).toHaveBeenCalledWith('island_location', JSON.stringify(location));
    expect(loadLocationFromStorage()).toEqual(location);
  });
  it('logs local location write failures without throwing', () => {
    const error = new Error('quota');
    setItem.mockImplementation(() => { throw error; });
    expect(() => saveLocationToStorage(location)).not.toThrow();
    expect(console.error).toHaveBeenCalledWith('[Weather] 保存位置信息到本地存储失败:', error);
  });
  it('returns no location after malformed JSON or denied cache reads', () => {
    local.set('island_location', 'not-json');
    expect(loadLocationFromStorage()).toBeNull();
    getItem.mockImplementation(() => { throw new Error('disabled'); });
    expect(loadLocationFromStorage()).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
