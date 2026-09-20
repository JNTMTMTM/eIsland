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
 * @file weatherSlice.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchWeatherMock,
  fetchLocationMock,
  resolveCoordinatesMock,
  saveWeatherLocationConfigMock,
  loadWeatherFromStorageMock,
  saveWeatherToStorageMock,
  loadLocationFromStorageMock,
  saveLocationToStorageMock,
  loadWeatherLocationConfigMock,
} = vi.hoisted(() => ({
  fetchWeatherMock: vi.fn(),
  fetchLocationMock: vi.fn(),
  resolveCoordinatesMock: vi.fn(),
  saveWeatherLocationConfigMock: vi.fn(),
  loadWeatherFromStorageMock: vi.fn(),
  saveWeatherToStorageMock: vi.fn(),
  loadLocationFromStorageMock: vi.fn(),
  saveLocationToStorageMock: vi.fn(),
  loadWeatherLocationConfigMock: vi.fn(),
}));

vi.mock('../../../api/weather/weatherApi', () => ({
  fetchWeather: fetchWeatherMock,
}));

vi.mock('../../../api/weather/locationApi', () => ({
  fetchLocation: fetchLocationMock,
}));

vi.mock('../../../api/weather/adcodeApi', () => ({
  resolveDistrictLocationByCoordinates: resolveCoordinatesMock,
}));

vi.mock('../../utils/storage', () => ({
  loadWeatherFromStorage: loadWeatherFromStorageMock,
  saveWeatherToStorage: saveWeatherToStorageMock,
  loadLocationFromStorage: loadLocationFromStorageMock,
  saveLocationToStorage: saveLocationToStorageMock,
  loadWeatherLocationConfig: loadWeatherLocationConfigMock,
  saveWeatherLocationConfig: saveWeatherLocationConfigMock,
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { createWeatherSlice } from '../weatherSlice';

type WeatherState = ReturnType<typeof createWeatherSlice>;

function createSliceState(creator: StateCreator<WeatherState, [], [], WeatherState>): { getState: () => WeatherState } {
  let state = {} as WeatherState;
  const setState = (updater: Partial<WeatherState> | ((prev: WeatherState) => Partial<WeatherState>)) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  state = creator(setState as never, (() => state) as never, {} as never);
  return { getState: () => state };
}

describe('createWeatherSlice', () => {
  const defaultWeather = { temperature: 22, description: '晴天' };

  beforeEach(() => {
    fetchWeatherMock.mockReset();
    fetchLocationMock.mockReset();
    resolveCoordinatesMock.mockReset();
    resolveCoordinatesMock.mockRejectedValue(new Error('offline'));
    saveWeatherLocationConfigMock.mockReset();
    saveWeatherLocationConfigMock.mockImplementation((config) => loadWeatherLocationConfigMock.mockReturnValue(config));
    loadWeatherFromStorageMock.mockReset();
    saveWeatherToStorageMock.mockReset();
    loadLocationFromStorageMock.mockReset();
    saveLocationToStorageMock.mockReset();
    loadWeatherLocationConfigMock.mockReset();

    loadWeatherFromStorageMock.mockReturnValue(defaultWeather);
    loadLocationFromStorageMock.mockReturnValue(null);
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'ip', customLocation: null });
  });

  it('persists weather when setWeather is called', () => {
    const store = createSliceState(createWeatherSlice);
    const nextWeather = { temperature: 30, description: '多云' };

    store.getState().setWeather(nextWeather as never);

    expect(saveWeatherToStorageMock).toHaveBeenCalledWith(nextWeather);
    expect(store.getState().weather).toEqual(nextWeather);
  });

  it('fetches weather from manual coordinates', async () => {
    fetchWeatherMock.mockResolvedValue({ temperature: 18, description: '雨天' });
    const store = createSliceState(createWeatherSlice);

    await store.getState().fetchWeatherData({ latitude: 31.2, longitude: 121.5 });

    expect(fetchWeatherMock).toHaveBeenCalledWith({ latitude: 31.2, longitude: 121.5 });
    expect(saveWeatherToStorageMock).toHaveBeenCalledWith({ temperature: 18, description: '雨天' });
    expect(store.getState().weather).toEqual({ temperature: 18, description: '雨天' });
  });

  it('skips weather request when force refresh has no location', async () => {
    fetchLocationMock.mockRejectedValue(new Error('network'));
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'ip', customLocation: null });

    const store = createSliceState(createWeatherSlice);
    await store.getState().fetchWeatherData(undefined, true);

    expect(fetchWeatherMock).not.toHaveBeenCalled();
    expect(saveWeatherToStorageMock).not.toHaveBeenCalled();
  });

  it('shares an in-flight location request between the calendar and weather', async () => {
    const location = { latitude: 31.2, longitude: 121.5, city: '上海', regionName: '上海', country: '中国', countryCode: 'CN', regionCode: 'SH' };
    let resolve!: (value: typeof location) => void;
    fetchLocationMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    fetchWeatherMock.mockResolvedValue(defaultWeather);
    const store = createSliceState(createWeatherSlice);
    const calendar = store.getState().refreshLocation();
    const weather = store.getState().fetchWeatherData();
    expect(fetchLocationMock).toHaveBeenCalledTimes(1);
    expect(fetchWeatherMock).not.toHaveBeenCalled();
    resolve(location);
    expect(await calendar).toEqual(location);
    await weather;
    expect(store.getState().location).toEqual(location);
    expect(saveLocationToStorageMock).toHaveBeenCalledWith(location);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
  });

  it('keeps custom location priority and does not request IP or weather for the calendar', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 1, longitude: 2, city: 'Custom' } });
    const store = createSliceState(createWeatherSlice);
    expect(await store.getState().refreshLocation()).toMatchObject({ latitude: 1, longitude: 2, city: 'Custom' });
    expect(fetchLocationMock).not.toHaveBeenCalled();
    expect(fetchWeatherMock).not.toHaveBeenCalled();
  });

  it('falls back to cached location on failure but not for forced refresh', async () => {
    const cached = { latitude: 1, longitude: 2, countryCode: 'US' };
    loadLocationFromStorageMock.mockReturnValue(cached);
    fetchLocationMock.mockRejectedValue(new Error('offline'));
    const store = createSliceState(createWeatherSlice);
    expect(await store.getState().refreshLocation()).toEqual(cached);
    expect(await store.getState().refreshLocation(true)).toBeNull();
    expect(fetchLocationMock).toHaveBeenCalledTimes(2);
  });

  it('resolves and persists country metadata for coordinate-only custom locations', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 35.6, longitude: 139.7 } });
    resolveCoordinatesMock.mockResolvedValue({ latitude: 35.6, longitude: 139.7, city: 'Tokyo', regionName: 'Tokyo', country: 'Japan', countryCode: 'JP' });
    const store = createSliceState(createWeatherSlice);
    const location = await store.getState().refreshLocation();
    expect(location).toMatchObject({ latitude: 35.6, longitude: 139.7, countryCode: 'JP' });
    expect(saveLocationToStorageMock).toHaveBeenCalledWith(location);
    expect(loadWeatherLocationConfigMock().customLocation).toMatchObject({ latitude: 35.6, longitude: 139.7, countryCode: 'JP', city: '' });
    // 重启后直接使用配置元数据，不依赖当次内存位置缓存。
    const restarted = createSliceState(createWeatherSlice);
    expect(await restarted.getState().refreshLocation()).toMatchObject({ countryCode: 'JP' });
    expect(resolveCoordinatesMock).toHaveBeenCalledTimes(1);
    expect(fetchLocationMock).not.toHaveBeenCalled();
  });

  it('shares custom metadata lookup between calendar and weather and preserves the chosen city label', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 35.6, longitude: 139.7, city: 'My city' } });
    let resolve!: (value: object) => void;
    resolveCoordinatesMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    fetchWeatherMock.mockResolvedValue(defaultWeather);
    const store = createSliceState(createWeatherSlice);
    const calendar = store.getState().refreshLocation();
    const weather = store.getState().fetchWeatherData();
    expect(resolveCoordinatesMock).toHaveBeenCalledTimes(1);
    resolve({ latitude: 35.6, longitude: 139.7, city: 'Tokyo', regionName: 'Tokyo', country: 'Japan', countryCode: 'JP' });
    expect(await calendar).toMatchObject({ city: 'My city', countryCode: 'JP' });
    await weather;
    expect(fetchWeatherMock).toHaveBeenCalledWith({ latitude: 35.6, longitude: 139.7 });
    expect(fetchLocationMock).not.toHaveBeenCalled();
  });

  it('reuses cached metadata only for the same coordinates', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 35.6, longitude: 139.7, city: 'Custom' } });
    loadLocationFromStorageMock.mockReturnValue({ latitude: 35.6, longitude: 139.7, city: 'Tokyo', regionName: 'Tokyo', country: 'Japan', countryCode: 'JP' });
    const store = createSliceState(createWeatherSlice);
    expect(await store.getState().refreshLocation()).toMatchObject({ countryCode: 'JP', city: 'Custom' });
    expect(resolveCoordinatesMock).not.toHaveBeenCalled();
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 40, longitude: -74 } });
    expect(await store.getState().refreshLocation()).toMatchObject({ latitude: 40, longitude: -74 });
    expect(store.getState().location?.countryCode).toBeUndefined();
    expect(resolveCoordinatesMock).toHaveBeenCalledWith(40, -74);
  });

  it('keeps weather usable when metadata lookup fails and retries on the next refresh', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 35.6, longitude: 139.7 } });
    fetchWeatherMock.mockResolvedValue(defaultWeather);
    const store = createSliceState(createWeatherSlice);
    await store.getState().fetchWeatherData();
    expect(fetchWeatherMock).toHaveBeenCalledWith({ latitude: 35.6, longitude: 139.7 });
    expect(saveWeatherLocationConfigMock).not.toHaveBeenCalled();
    resolveCoordinatesMock.mockResolvedValue({ latitude: 35.6, longitude: 139.7, city: '', regionName: '', country: 'Japan', countryCode: 'JP' });
    expect(await store.getState().refreshLocation()).toMatchObject({ countryCode: 'JP' });
    expect(resolveCoordinatesMock).toHaveBeenCalledTimes(2);
    expect(fetchLocationMock).not.toHaveBeenCalled();
  });

  it('does not apply a custom lookup result after the configured location changes', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 35.6, longitude: 139.7 } });
    let resolveOld!: (value: object) => void;
    resolveCoordinatesMock.mockReturnValueOnce(new Promise((done) => { resolveOld = done; }));
    const store = createSliceState(createWeatherSlice);
    const pending = store.getState().refreshLocation();
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'custom', customLocation: { latitude: 40, longitude: -74, countryCode: 'US' } });
    resolveOld({ latitude: 35.6, longitude: 139.7, city: '', regionName: '', country: 'Japan', countryCode: 'JP' });
    expect(await pending).toMatchObject({ latitude: 40, longitude: -74, countryCode: 'US' });
    expect(saveWeatherLocationConfigMock).not.toHaveBeenCalled();
    expect(saveLocationToStorageMock).toHaveBeenCalledTimes(1);
    expect(store.getState().location?.countryCode).toBe('US');
  });

  it('enriches the custom fallback when IP-priority lookup fails', async () => {
    loadWeatherLocationConfigMock.mockReturnValue({ priority: 'ip', customLocation: { latitude: 35.6, longitude: 139.7 } });
    fetchLocationMock.mockRejectedValue(new Error('offline'));
    resolveCoordinatesMock.mockResolvedValue({ latitude: 35.6, longitude: 139.7, city: '', regionName: '', country: 'Japan', countryCode: 'JP' });
    const store = createSliceState(createWeatherSlice);
    expect(await store.getState().refreshLocation()).toMatchObject({ countryCode: 'JP' });
    expect(loadWeatherLocationConfigMock().priority).toBe('ip');
  });
});
