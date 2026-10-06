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
 * @file districtResponseBoundaries.test.ts
 * @description 行政区接口响应坐标别名、非法坐标及缺失元数据边界测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { mockNetFetch, mockLoadNetworkConfig, mockI18nT, mockLogger } = vi.hoisted(() => ({
  mockNetFetch: vi.fn(),
  mockLoadNetworkConfig: vi.fn(() => ({ timeoutMs: 10000 })),
  mockI18nT: vi.fn((translationKey: string, opts?: { defaultValue?: string; [k: string]: unknown }) => {
    if (!opts?.defaultValue) return translationKey;
    let result = opts.defaultValue;
    Object.entries(opts).forEach(([k, v]) => {
      if (k !== 'defaultValue') result = result.replace(`{{${k}}}`, String(v));
    });
    return result;
  }),
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../store/utils/storage', () => ({
  loadNetworkConfig: mockLoadNetworkConfig,
}));

vi.mock('../../../utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../../../i18n', () => ({
  default: { t: mockI18nT },
}));

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

const makeSuccessBody = (items: Array<Record<string, unknown>>): string =>
  JSON.stringify({ code: 200, results: items });

beforeEach(() => {
  vi.resetModules();
  mockNetFetch.mockReset();
  mockLoadNetworkConfig.mockReturnValue({ timeoutMs: 10000 });
  vi.stubGlobal('window', { api: { netFetch: mockNetFetch } });
});
afterEach(() => vi.unstubAllGlobals());

describe('district coordinate response boundaries', () => {
  it.each([
    { center: { latitude: '31', lon: '121' }, expected: [31, 121] },
    { center: { latitude: '31', longitude: '121' }, expected: [31, 121] },
    { center: { lat: 'bad', longitude: 121 }, location: '31,121', expected: [31, 121] },
    { center: { lat: 31, lng: 'bad' }, location: '31,121', expected: [31, 121] },
    { center: '181,91', location: '31,121', expected: [31, 121] },
  ])('uses valid aliases or location after invalid center $center', async ({ center, location, expected }) => {
    mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeSuccessBody([{ center, location, name: 'City' }]) });
    const api = await import('../adcodeApi');
    expect(await api.resolveDistrictLocationByKeyword('City')).toMatchObject({ latitude: expected[0], longitude: expected[1] });
  });
  it.each([{ code: 200 }, { code: 200, data: 'invalid' }, { code: 200, data: {} }, { code: 200, data: { list: {}, results: {} } }])('rejects responses without a district array %j', async (response) => {
    mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: JSON.stringify(response) });
    const api = await import('../adcodeApi');
    await expect(api.resolveDistrictLocationByKeyword('City')).rejects.toThrow('未查询到');
  });
  it('falls back to translated error code when server messages are absent', async () => {
    mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: '{"code":503}' });
    const api = await import('../adcodeApi');
    await expect(api.fetchDistrictByAdcode({ keyword: 'City' })).rejects.toThrow('503');
  });
  it.each([{ country_code: 'cn', city: 'City' }, { country_code: 'cn' }])('allows missing country and city names %j', async (district) => {
    mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeSuccessBody([district]) });
    const api = await import('../adcodeApi');
    expect(await api.resolveDistrictLocationByCoordinates(31, 121)).toEqual({ latitude: 31, longitude: 121, city: 'city' in district ? district.city : '', regionName: '', country: '', countryCode: 'CN' });
  });
});
