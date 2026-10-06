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
 * @file useSettingsWeather.test.ts
 * @description 天气位置保存、优先级、三个真实提供商测试流程和失败恢复回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsWeather } from '../useSettingsWeather';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
const mocks = vi.hoisted(() => ({
  resolveCity: vi.fn<() => Promise<{
    latitude: number;
    longitude: number;
    city: string;
  }>>(),
  loadLocation: vi.fn<() => {
    customLocation: {
      latitude: number;
      longitude: number;
      city: string;
    } | null;
  }>(),
  saveLocation: vi.fn(),
  request: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  token: vi.fn<() => string | null>()
}));
vi.mock('../../../../../../../api/weather/adcodeApi', () => ({
  resolveDistrictLocationByKeyword: mocks.resolveCity
}));
vi.mock('../../../../../../../api/user/userAccountApi.client', () => ({
  request: mocks.request
}));
vi.mock('../../../../../../../utils/userAccount', () => ({
  readLocalToken: mocks.token
}));
vi.mock('../../../../../../../store/utils/storage', () => ({
  DEFAULT_WEATHER_LOCATION_PRIORITY: 'ip',
  DEFAULT_WEATHER_PRIMARY_PROVIDER: 'open-meteo',
  loadWeatherLocationConfig: mocks.loadLocation,
  saveWeatherLocationConfig: mocks.saveLocation
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsWeather>[0];
const fetchWeatherData = vi.fn<Options['fetchWeatherData']>();
const netFetch = vi.fn<(url: string, options: unknown) => Promise<{
  ok: boolean;
  status: number;
  body: string;
}>>();
const storeWrite = vi.fn<(key: string, enabled: boolean) => Promise<void>>();
const t = vi.fn<(key: string, values?: Record<string, unknown>) => string>((key) => key);
const city = {
  latitude: 39.12345,
  longitude: 116.54321,
  city: 'Beijing'
};
/**
 * 重复执行真实天气 Hook，保留配置及忙碌状态。
 * @returns Hook 返回的实际状态和异步操作。
 */
function render() {
  return renderWithHooks(() => useSettingsWeather({
    fetchWeatherData,
    t: t as unknown as Options['t'],
    networkTimeoutMs: 6500
  }));
}
/**
 * 等待位置解析、并行服务和告警保存队列。
 * @returns 异步回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  mocks.resolveCity.mockResolvedValue(city);
  mocks.loadLocation.mockReturnValue({
    customLocation: null
  });
  mocks.request.mockResolvedValue({
    ok: true
  });
  mocks.token.mockReturnValue('token');
  fetchWeatherData.mockResolvedValue(undefined);
  netFetch.mockResolvedValue({
    ok: true,
    status: 200,
    body: '{"weather":"ok"}'
  });
  storeWrite.mockResolvedValue(undefined);
  t.mockImplementation((key) => key);
  vi.stubGlobal('window', {
    api: {
      netFetch,
      storeWrite
    }
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('实际定位配置和优先级', () => {
  it.each([{
    priority: 'ip',
    hasInput: false,
    hasExisting: false
  }, {
    priority: 'custom',
    hasInput: false,
    hasExisting: false
  }, {
    priority: 'ip',
    hasInput: false,
    hasExisting: true
  }, {
    priority: 'custom',
    hasInput: false,
    hasExisting: true
  }, {
    priority: 'ip',
    hasInput: true,
    hasExisting: false
  }, {
    priority: 'custom',
    hasInput: true,
    hasExisting: false
  }] as const)('切换$priority，输入=$hasInput，旧位置=$hasExisting', async ({
    priority,
    hasInput,
    hasExisting
  }) => {
    mocks.loadLocation.mockReturnValue({
      customLocation: hasExisting ? city : null
    });
    if (hasInput) render().setWeatherCustomCityInput(' Beijing ');
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old test'
    });
    await render().applyWeatherLocationPriority(priority);
    expect(render().weatherLocationPriority).toBe(priority);
    expect(mocks.resolveCity).toHaveBeenCalledTimes(hasInput ? 1 : 0);
    expect(mocks.saveLocation).toHaveBeenCalledWith({
      priority,
      customLocation: hasInput || hasExisting ? city : null
    });
    expect(render().weatherLocationConfigMessage?.type).toBe(priority === 'custom' && !hasInput && !hasExisting ? 'error' : 'success');
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    expect(fetchWeatherData).toHaveBeenCalledWith(undefined, true);
  });
  it.each([new Error('city unavailable'), 'failed'])('切换解析错误%o显示错误并保持所选优先级', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().applyWeatherLocationPriority('custom');
    expect(render().weatherLocationConfigMessage?.type).toBe('error');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.switchPriorityFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(mocks.saveLocation).not.toHaveBeenCalled();
  });
  it('切换时已保存配置、刷新失败不反转成功消息', async () => {
    fetchWeatherData.mockRejectedValue(new Error('weather offline'));
    await render().applyWeatherLocationPriority('ip');
    await settle();
    expect(render().weatherLocationConfigMessage?.type).toBe('success');
  });
  it('自定义优先级需要城市；不发解析和保存请求', async () => {
    render().setWeatherLocationPriority('custom');
    render().setWeatherCustomCityInput('  ');
    await render().saveWeatherLocationSettings();
    expect(render().weatherLocationConfigMessage?.text).toBe('settings.weather.messages.customNeedsCity');
    expect(mocks.saveLocation).not.toHaveBeenCalled();
    expect(mocks.resolveCity).not.toHaveBeenCalled();
  });
  it.each([false, true])('保存配置含城市=%s并清空旧测试消息', async (withCity) => {
    if (withCity) {
      render().setWeatherCustomCityInput(' Beijing ');
      render().setWeatherLocationPriority('custom');
    }
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old'
    });
    fetchWeatherData.mockRejectedValue(new Error('refresh'));
    await render().saveWeatherLocationSettings();
    await settle();
    expect(mocks.saveLocation).toHaveBeenCalledWith({
      priority: withCity ? 'custom' : 'ip',
      customLocation: withCity ? city : null
    });
    expect(render().weatherLocationConfigMessage?.text).toBe(withCity ? 'settings.weather.messages.configSavedWithCity' : 'settings.weather.messages.configSaved');
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    if (withCity) {
      expect(t).toHaveBeenCalledWith('settings.weather.messages.configSavedWithCity', expect.objectContaining({
        city: 'Beijing',
        lat: '39.1234',
        lng: '116.5432'
      }));
    }
  });
  it.each([new Error('resolve failed'), 'failure'])('保存解析错误%o不会保存', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().saveWeatherLocationSettings();
    expect(render().weatherLocationConfigMessage?.text).toBe('settings.weather.messages.cityResolveFailed');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.cityResolveFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(mocks.saveLocation).not.toHaveBeenCalled();
  });
});
describe('实际城市测试与三提供商聚合', () => {
  it('空城市立即提示，禁止所有外部服务', async () => {
    render().setWeatherCustomCityInput(' ');
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTestMessage?.text).toBe('settings.weather.messages.cityRequired');
    expect(mocks.resolveCity).not.toHaveBeenCalled();
    expect(netFetch).not.toHaveBeenCalled();
  });
  it.each([new Error('city failed'), 'failure'])('城市解析错误%o恢复busy并使用错误回退', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTesting).toBe(false);
    expect(render().weatherCustomLocationTestMessage?.text).toBe('settings.weather.messages.cityResolveFailed');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.cityResolveFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(netFetch).not.toHaveBeenCalled();
  });
  it.each(['success', 'http-failed', 'html', 'bad-json', 'error', 'non-error', 'pro-unauthorized', 'pro-no-token', 'pro-error', 'pro-non-error'])('并行提供商模式%s执行实际解析与聚合', async (mode) => {
    render().setWeatherCustomCityInput(' Beijing ');
    if (mode === 'http-failed') {
      netFetch.mockResolvedValue({
        ok: false,
        status: 503,
        body: '{}'
      });
    }
    if (mode === 'html') {
      netFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: '  <html>offline</html>'
      });
    }
    if (mode === 'bad-json') {
      netFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: 'not json'
      });
    }
    if (mode === 'error') netFetch.mockRejectedValue(new Error('offline'));
    if (mode === 'non-error') netFetch.mockRejectedValue('unknown');
    if (mode === 'pro-unauthorized') {
      mocks.request.mockResolvedValue({
        ok: false,
        code: 401,
        message: 'not pro'
      });
    }
    if (mode === 'pro-no-token') mocks.token.mockReturnValue(null);
    if (mode === 'pro-error') mocks.request.mockRejectedValue(new Error('pro offline'));
    if (mode === 'pro-non-error') mocks.request.mockRejectedValue('unknown');
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTesting).toBe(false);
    expect(render().weatherCustomLocationTestMessage?.type).toBe(mode === 'success' ? 'success' : 'error');
    const [openCall, uapiCall] = netFetch.mock.calls;
    const open = new URL(openCall[0]);
    const uapi = new URL(uapiCall[0]);
    expect(open.hostname).toBe('api.open-meteo.com');
    expect(open.searchParams.get('latitude')).toBe('39.12345');
    expect(open.searchParams.get('longitude')).toBe('116.54321');
    expect(open.searchParams.get('current')).toBe('temperature_2m');
    expect(openCall[1]).toEqual({
      timeoutMs: 6500
    });
    expect(uapi.hostname).toBe('uapis.cn');
    expect(uapi.searchParams.get('city')).toBe('Beijing');
    expect(uapiCall[1]).toEqual({
      timeoutMs: 6500
    });
    if (mode !== 'pro-no-token') {
      expect(mocks.request).toHaveBeenCalledWith(expect.stringContaining('location=116.54321%2C39.12345'), {
        method: 'GET',
        auth: 'token',
        timeoutMs: 6500
      });
    }
    if (mode === 'non-error' || mode === 'pro-non-error') {
      expect(t).toHaveBeenCalledWith('settings.weather.messages.providerUnavailable', expect.objectContaining({
        error: 'settings.common.unknownError'
      }));
    }
    if (mode === 'http-failed') {
      expect(t).toHaveBeenCalledWith('settings.weather.messages.providerUnavailable', expect.objectContaining({
        error: 'Open-Meteo HTTP 503'
      }));
    }
    if (mode === 'html') {
      expect(t).toHaveBeenCalledWith('settings.weather.messages.providerNonJson', expect.objectContaining({
        name: 'UAPI'
      }));
    }
    expect(t).toHaveBeenCalledWith('settings.weather.messages.testResult', expect.objectContaining({
      city: 'Beijing',
      lat: '39.1234',
      lng: '116.5432'
    }));
  });
  it('解析后无城市名不发送UAPI city参数', async () => {
    mocks.resolveCity.mockResolvedValue({
      ...city,
      city: ''
    });
    render().setWeatherCustomCityInput('coordinates');
    await render().testWeatherCustomLocation();
    expect(new URL(netFetch.mock.calls[1][0]).searchParams.has('city')).toBe(false);
  });
  it('服务等待时busy为true并清除旧消息，全部完成后恢复', async () => {
    render().setWeatherCustomCityInput('city');
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old'
    });
    let resolve: (value: {
      ok: boolean;
      status: number;
      body: string;
    }) => void = () => undefined;
    netFetch.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    const pending = render().testWeatherCustomLocation();
    await settle();
    expect(render().weatherCustomLocationTesting).toBe(true);
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    resolve({
      ok: true,
      status: 200,
      body: '{}'
    });
    await pending;
    expect(render().weatherCustomLocationTesting).toBe(false);
  });
});
describe('预警开关', () => {
  it.each([true, false])('预警%s立即保存并隔离写入失败', async (enabled) => {
    storeWrite.mockRejectedValue(new Error('write failed'));
    render().applyWeatherAlertEnabled(enabled);
    await settle();
    expect(render().weatherAlertEnabled).toBe(enabled);
    expect(storeWrite).toHaveBeenCalledWith('weather-alert-enabled', enabled);
  });
});
