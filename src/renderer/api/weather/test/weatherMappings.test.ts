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
 * @file weatherMappings.test.ts
 * @description 天气供应商公开请求覆盖缺省数据、天气文字与图标映射、预警字段清洗及位置回退。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStartupWeatherAlerts, fetchWeather } from '../weatherApi';

/** 位置边界保留 unknown，以真实供应商入口验证损坏存储数据。 */
interface WeatherFixtureState {
  provider: string;
  priority: string;
  custom: unknown;
  cached: unknown;
  token: string;
  net: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
  locate: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

const state = vi.hoisted((): WeatherFixtureState => ({
  provider: 'uapi', priority: 'custom', custom: null, cached: null, token: 'token',
  net: vi.fn(), request: vi.fn(), locate: vi.fn(), save: vi.fn(),
}));
vi.mock('../../../store/utils/storage', () => ({
  loadNetworkConfig: () => ({ timeoutMs: 1000 }),
  loadWeatherProviderConfig: () => ({ primaryProvider: state.provider }),
  loadWeatherLocationConfig: () => ({ priority: state.priority, customLocation: state.custom }),
  loadLocationFromStorage: () => state.cached,
  saveLocationToStorage: state.save,
}));
vi.mock('../../../utils/userAccount', () => ({ readLocalToken: () => state.token }));
vi.mock('../../../utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock('../../user/userAccountApi.client', () => ({ request: state.request }));
vi.mock('../locationApi', () => ({ fetchLocation: state.locate }));

beforeEach(() => {
  state.provider = 'uapi';
  state.priority = 'custom';
  state.custom = null;
  state.cached = null;
  state.token = 'token';
  state.net.mockReset();
  state.request.mockReset();
  state.locate.mockReset().mockResolvedValue({ latitude: 3, longitude: 4, city: ' IP City ' });
  vi.stubGlobal('window', { api: { netFetch: state.net } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * 提供独立供应商 JSON 响应。
 * @param body - 上游 JSON 字段对象，不预先执行生产映射。
 */
function reply(body: unknown): void {
  state.net.mockResolvedValue({ ok: true, status: 200, body: JSON.stringify(body) });
}

describe('UAPI weather defaults and mappings', () => {
  it.each([
    { text: '', code: 0 }, { text: '雷雨', code: 95 }, { text: '暴雪', code: 75 }, { text: '大雪', code: 75 },
    { text: '中雪', code: 73 }, { text: '阵雪', code: 85 }, { text: '小雪', code: 71 },
    { text: '冻雨', code: 67 }, { text: '暴雨', code: 82 }, { text: '强雨', code: 82 },
    { text: '阵雨', code: 80 }, { text: '小雨', code: 61 }, { text: '中雨', code: 63 }, { text: '大雨', code: 65 }, { text: '雨', code: 63 },
    { text: '雾', code: 45 }, { text: '霾', code: 45 }, { text: '沙尘', code: 45 }, { text: '阴', code: 3 },
    { text: '多云', code: 2 }, { text: '晴', code: 0 }, { text: '未知文本', code: 0 },
  ])('falls back from unknown icons to $text', async ({ text, code }) => {
    reply({ weather: text, weather_icon: '10000' });
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather.iconCode).toBe(code);
    expect(weather.forecast.map((day) => day.iconCode)).toEqual([code, code]);
  });
  it.each([{ icon: '0', expected: 0 }, { icon: '3', expected: 3 }, { icon: '45', expected: 45 }, { icon: '99', expected: 99 }, { icon: '4', expected: 2 }, { icon: '44', expected: 2 }, { icon: '100', expected: 0 }, { icon: '499', expected: 73 }])('handles icon $icon', async ({ icon, expected }) => {
    reply({ weather: '多云', weather_icon: icon });
    expect((await fetchWeather({ latitude: 1, longitude: 2 })).iconCode).toBe(expected);
  });
  it.each([{ wind: undefined, expected: 0 }, { wind: '', expected: 0 }, { wind: '静风', expected: 0 }, { wind: '3.4-5.5级', expected: 6 }])('parses wind $wind', async ({ wind, expected }) => {
    reply({ wind_power: wind });
    expect((await fetchWeather({ latitude: 1, longitude: 2 })).windSpeed).toBe(expected);
  });
  it('uses zero/default values for missing current and forecast fields', async () => {
    reply({});
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather).toMatchObject({ temperature: 0, description: '未知', humidity: 0, windSpeed: 0, uvIndex: 0, iconCode: 0 });
    expect(weather.forecast).toEqual(Array(2).fill({ temperature: 0, description: '未知', temperatureMax: 0, temperatureMin: 0, windSpeed: -1, uvIndex: 0, precipitationProbability: -1, iconCode: 0 }));
  });
  it('uses night descriptions and current fallback fields for sparse forecasts', async () => {
    reply({ data: { temperature: 20.4, weather: '多云', weather_icon: '101', uv: 3, forecast: [{}, { weather_night: '阵雪', temp_max: 28, temp_min: 18, wind_speed_day: 3.7, precip: 12.5 }, { weather_day: '晴', weather_icon: '100', uv_index: 4 }] } });
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather.forecast[0]).toMatchObject({ description: '阵雪', temperature: 23, temperatureMax: 28, temperatureMin: 18, windSpeed: 4, precipitationProbability: 13, uvIndex: 3, iconCode: 2 });
    expect(weather.forecast[1]).toMatchObject({ description: '晴', temperatureMax: 20, temperatureMin: 20, uvIndex: 4, iconCode: 0 });
  });
});

describe('QWeather sparse daily responses', () => {
  it.each([{ daily: null }, { daily: {} }, { daily: [] }])('falls back after unusable daily field $daily', async ({ daily }) => {
    state.provider = 'qweather-pro';
    state.request.mockResolvedValue({ ok: true, code: 200, data: { daily } });
    reply({});
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather.temperature).toBe(0);
    expect(state.request).toHaveBeenCalledOnce();
    expect(state.net).toHaveBeenCalledTimes(2);
  });
  it('uses defaults for missing numbers and empty day fields', async () => {
    state.provider = 'qweather-pro';
    state.request.mockResolvedValue({ ok: true, code: 200, data: { daily: [{}] } });
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather).toMatchObject({ temperature: 0, description: '未知', humidity: 0, windSpeed: 0, uvIndex: 0, iconCode: 0 });
    expect(weather.forecast).toHaveLength(2);
    expect(weather.forecast[0]).toMatchObject({ temperature: 0, temperatureMax: 0, temperatureMin: 0, precipitationProbability: 0, iconCode: 0 });
  });
  it('uses night values, invalid numeric fallbacks and current data for missing days', async () => {
    state.provider = 'qweather-pro';
    state.request.mockResolvedValue({ ok: true, code: 200, data: { daily: [{ tempMax: '22.6', tempMin: 'bad', textDay: '', textNight: '阵雪', iconDay: '', iconNight: '406', windSpeedDay: '', windSpeedNight: '3.6', uvIndex: 'bad', humidity: 'bad' }, { tempMax: 'bad', tempMin: '', textDay: '', textNight: '中雨', iconNight: '306', windSpeedNight: 'bad', uvIndex: '', precip: 'bad' }, {}] } });
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather).toMatchObject({ temperature: 23, description: '阵雪', humidity: 0, windSpeed: 4, uvIndex: 0, iconCode: 85 });
    expect(weather.forecast[0]).toMatchObject({ temperature: 23, description: '中雨', windSpeed: 4, iconCode: 63 });
    expect(weather.forecast[1]).toMatchObject({ temperature: 23, description: '阵雪', windSpeed: 4, iconCode: 85 });
  });
});

describe('Open-Meteo defaults and terminal errors', () => {
  it.each([{ current: {} }, { daily: {} }])('falls back when a required container is missing %j', async (body) => {
    state.provider = 'open-meteo';
    reply({});
    state.net.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify(body) });
    expect((await fetchWeather({ latitude: 1, longitude: 2 })).temperature).toBe(0);
    expect(state.net).toHaveBeenCalledTimes(2);
  });
  it('passes a cached city to UAPI requests', async () => {
    state.cached = { city: 'Beijing' };
    reply({});
    await fetchWeather({ latitude: 1, longitude: 2 });
    expect(state.net).toHaveBeenCalledWith(expect.stringContaining('city=Beijing'), { timeoutMs: 1000 });
  });
  it('defaults every missing scalar/array while keeping current and daily containers', async () => {
    state.provider = 'open-meteo';
    reply({ current: {}, daily: {} });
    const weather = await fetchWeather({ latitude: 1, longitude: 2 });
    expect(weather).toMatchObject({ temperature: 0, humidity: 0, windSpeed: 0, uvIndex: 0, iconCode: 0 });
    expect(weather.forecast[0]).toMatchObject({ temperature: 0, temperatureMax: 0, temperatureMin: 0, windSpeed: 0, uvIndex: 0, precipitationProbability: 0, iconCode: 0 });
  });
  it('wraps non-Error failures after all providers fail', async () => {
    state.net.mockRejectedValue('offline');
    await expect(fetchWeather({ latitude: 1, longitude: 2 })).rejects.toThrow('Weather providers unavailable');
  });
});

describe('startup weather alert locations and metadata', () => {
  it('rejects when no location source is usable', async () => {
    state.locate.mockResolvedValue(null);
    await expect(fetchStartupWeatherAlerts('token')).rejects.toThrow('Weather alert location unavailable');
    expect(state.request).not.toHaveBeenCalled();
  });
  it.each([{ raw: 'invalid' }, { raw: { latitude: '1', longitude: 2 } }, { raw: { latitude: NaN, longitude: 2 } }, { raw: { latitude: 1, longitude: '2' } }, { raw: { latitude: 1, longitude: Infinity } }, { raw: { latitude: 1, longitude: 2, city: ' ' } }, { raw: { latitude: 1, longitude: 2, city: 4 } }])('validates custom location $raw', async ({ raw }) => {
    state.custom = raw;
    state.request.mockResolvedValue({ ok: true, code: 200, data: {} });
    const result = await fetchStartupWeatherAlerts(' token ');
    expect(result.alerts).toEqual([]);
    expect(result.location).toEqual(typeof raw === 'object' && raw.latitude === 1 && raw.longitude === 2 ? { latitude: 1, longitude: 2, city: '' } : { latitude: 3, longitude: 4, city: 'IP City' });
  });
  it('cleans alert fields and applies title/id fallback precedence', async () => {
    state.custom = { latitude: 1, longitude: 2, city: ' City ' };
    state.request.mockResolvedValue({ ok: true, code: 200, data: { warning: [{}, { id: ' ', title: ' ', typeName: ' 雨 ', text: ' text ', level: 1, severity: false, severityColor: 2, sender: null, pubTime: 3 }, { id: ' abc ', title: ' title ', typeName: ' type ', level: ' level ', severity: ' severity ', severityColor: ' yellow ', sender: ' sender ', pubTime: ' date ' }] } });
    const { alerts } = await fetchStartupWeatherAlerts('token');
    expect(alerts[0]).toEqual({ id: 'alert-1', title: '天气预警', text: '', level: '', severity: '', severityColor: '', typeName: '', sender: '', pubTime: '' });
    expect(alerts[1]).toMatchObject({ id: 'alert-2', title: '雨', text: 'text', level: '', severity: '', severityColor: '', sender: '', pubTime: '' });
    expect(alerts[2]).toMatchObject({ id: 'abc', title: 'title', typeName: 'type', level: 'level', severity: 'severity', severityColor: 'yellow', sender: 'sender', pubTime: 'date' });
  });
  it('uses cached location when IP and custom candidates fail', async () => {
    state.priority = 'ip';
    state.cached = { latitude: 1, longitude: 2 };
    state.locate.mockRejectedValue(new Error('offline'));
    state.request.mockResolvedValue({ ok: true, code: 200, data: { warning: null } });
    expect((await fetchStartupWeatherAlerts('token')).location).toEqual({ latitude: 1, longitude: 2, city: '' });
  });
});
