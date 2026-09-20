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
 * @file adcodeApi.test.ts
 * @description adcodeApi 单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  hoisted mocks                                                     */
/* ------------------------------------------------------------------ */

const { mockNetFetch, mockLoadNetworkConfig, mockI18nT, mockLogger } = vi.hoisted(() => ({
  mockNetFetch: vi.fn(),
  mockLoadNetworkConfig: vi.fn(() => ({ timeoutMs: 10000 })),
  mockI18nT: vi.fn((_key: string, opts?: { defaultValue?: string; [k: string]: unknown }) => {
    if (!opts?.defaultValue) return '';
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

type TestWindow = {
  api?: {
    netFetch: ReturnType<typeof vi.fn>;
  };
};

const setTestWindow = (value: TestWindow): void => {
  Object.defineProperty(globalThis, 'window', {
    value,
    configurable: true,
    writable: true,
  });
};

const makeSuccessBody = (items: Array<Record<string, unknown>>): string =>
  JSON.stringify({ code: 200, results: items });

const makeDataListBody = (items: Array<Record<string, unknown>>): string =>
  JSON.stringify({ code: 200, data: { list: items } });

const makeDataArrayBody = (items: Array<Record<string, unknown>>): string =>
  JSON.stringify({ code: 200, data: items });

const makeDataResultsBody = (items: Array<Record<string, unknown>>): string =>
  JSON.stringify({ code: 200, data: { results: items } });

/* ------------------------------------------------------------------ */
/*  tests                                                             */
/* ------------------------------------------------------------------ */

describe('adcodeApi', () => {
  describe('resolveDistrictLocationByCoordinates', () => {
    it('queries coordinates and preserves them instead of the returned district centroid', async () => {
      mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeSuccessBody([
        { name: 'Tokyo', country: 'Japan', country_code: 'jp', province: 'Tokyo', center: { lat: 35.7, lng: 139.8 } },
      ]) });
      const { resolveDistrictLocationByCoordinates } = await import('../adcodeApi');
      expect(await resolveDistrictLocationByCoordinates(35.6, 139.7)).toEqual({
        latitude: 35.6, longitude: 139.7, city: 'Tokyo', country: 'Japan', countryCode: 'JP', regionName: 'Tokyo',
      });
      const url = new URL(mockNetFetch.mock.calls[0][0]);
      expect(url.searchParams.get('lat')).toBe('35.6');
      expect(url.searchParams.get('lng')).toBe('139.7');
      expect(url.searchParams.get('limit')).toBe('1');
    });

    it('supports zero and negative coordinates with the existing response envelopes', async () => {
      mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeDataListBody([
        { name: 'Test', country_code: 'EC', country: 'Ecuador' },
      ]) });
      const { resolveDistrictLocationByCoordinates } = await import('../adcodeApi');
      expect(await resolveDistrictLocationByCoordinates(0, -78)).toMatchObject({ latitude: 0, longitude: -78, countryCode: 'EC' });
      expect(new URL(mockNetFetch.mock.calls[0][0]).searchParams.get('lat')).toBe('0');
    });

    it.each([[], [{ country: 'Japan' }], [{ country_code: 'JPN' }], [{ country_code: '1A' }]])('rejects missing or invalid country metadata: %j', async (...items) => {
      mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeSuccessBody(items as Array<Record<string, unknown>>) });
      const { resolveDistrictLocationByCoordinates } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByCoordinates(35.6, 139.7)).rejects.toThrow('no country code');
    });

    it.each([[91, 0], [0, -181], [NaN, 0], [0, Infinity]])('rejects invalid coordinates %s, %s before requesting', async (latitude, longitude) => {
      const { resolveDistrictLocationByCoordinates } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByCoordinates(latitude, longitude)).rejects.toThrow('Invalid custom location');
      expect(mockNetFetch).not.toHaveBeenCalled();
    });
  });

  beforeEach(() => {
    vi.resetModules();
    mockNetFetch.mockReset();
    mockLoadNetworkConfig.mockReset();
    mockI18nT.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();

    mockLoadNetworkConfig.mockReturnValue({ timeoutMs: 10000 });

    setTestWindow({
      api: { netFetch: mockNetFetch },
    });
  });

  /* ============================================================= */
  /*  fetchDistrictByAdcode                                         */
  /* ============================================================= */

  describe('fetchDistrictByAdcode', () => {
    it('sends correct query params for adcode', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'Beijing', adcode: '110000' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ adcode: '110000' });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('adcode=110000');
      expect(calledUrl).toContain('uapis.cn');
    });

    it('sends both keyword and keywords params', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'Beijing' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'Beijing' });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('keyword=Beijing');
      expect(calledUrl).toContain('keywords=Beijing');
    });

    it('uses keywords field when keyword is absent', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'Shanghai' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keywords: 'Shanghai' });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('keyword=Shanghai');
    });

    it('sends subdistrict param', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'test' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'test', subdistrict: 2 });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('subdistrict=2');
    });

    it('sends page and page_size params', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'test' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'test', page: 2, pageSize: 20 });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('page_size=20');
    });

    it('floors fractional page numbers', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'test' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'test', page: 2.7, pageSize: 9.3 });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('page_size=9');
    });

    it('ignores page <= 0', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'test' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'test', page: 0, pageSize: -1 });

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('page=');
      expect(calledUrl).not.toContain('page_size=');
    });

    it('throws when no query params are provided', async () => {
      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({})).rejects.toThrow('缺少查询参数');
    });

    it('throws when adcode is empty and keyword is absent', async () => {
      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({ adcode: '   ' })).rejects.toThrow('缺少查询参数');
    });

    it('passes timeoutMs from loadNetworkConfig', async () => {
      mockLoadNetworkConfig.mockReturnValue({ timeoutMs: 5000 });
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'test' }]),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await fetchDistrictByAdcode({ keyword: 'test' });

      expect(mockNetFetch).toHaveBeenCalledWith(
        expect.any(String),
        { timeoutMs: 5000 },
      );
    });

    it('throws on HTTP error response', async () => {
      mockNetFetch.mockResolvedValue({
        ok: false,
        status: 503,
        body: 'Service Unavailable',
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({ keyword: 'test' }))
        .rejects.toThrow('HTTP 503');
    });

    it('throws on non-JSON (HTML) response', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: '<!DOCTYPE html><html><body>Error</body></html>',
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({ keyword: 'test' }))
        .rejects.toThrow('非 JSON');
    });

    it('throws when API returns non-200 code', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 400, msg: 'Invalid parameter' }),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({ keyword: 'test' }))
        .rejects.toThrow('Invalid parameter');
    });

    it('uses message field when msg is absent in error response', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 400, message: 'Bad request' }),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      await expect(fetchDistrictByAdcode({ keyword: 'test' }))
        .rejects.toThrow('Bad request');
    });

    it('returns parsed result on success', async () => {
      const items = [{ name: 'Beijing', adcode: '110000', lat: 39.9, lng: 116.4 }];
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody(items),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      const result = await fetchDistrictByAdcode({ keyword: 'Beijing' });

      expect(result.code).toBe(200);
      expect(result.results).toHaveLength(1);
      expect(result.results![0].name).toBe('Beijing');
    });

    it('accepts response without code field', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ results: [{ name: 'test' }] }),
      });

      const { fetchDistrictByAdcode } = await import('../adcodeApi');
      const result = await fetchDistrictByAdcode({ keyword: 'test' });
      expect(result.results).toHaveLength(1);
    });
  });

  /* ============================================================= */
  /*  resolveDistrictLocationByKeyword                              */
  /* ============================================================= */

  describe('resolveDistrictLocationByKeyword', () => {
    it('throws on empty keyword', async () => {
      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByKeyword('')).rejects.toThrow('请输入城市名称');
    });

    it('throws on whitespace-only keyword', async () => {
      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByKeyword('   ')).rejects.toThrow('请输入城市名称');
    });

    it('throws when no results found', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByKeyword('NonexistentCity'))
        .rejects.toThrow('未查询到该城市');
    });

    it('throws when results have no coordinates', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([{ name: 'TestCity' }]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByKeyword('TestCity'))
        .rejects.toThrow('缺少经纬度信息');
    });

    it('returns best matching result with lat/lng fields', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'Beijing', adcode: '110000', lat: 39.9042, lng: 116.4074 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Beijing');

      expect(result.latitude).toBe(39.9042);
      expect(result.longitude).toBe(116.4074);
      expect(result.city).toBe('Beijing');
      expect(result.adcode).toBe('110000');
    });

    it('resolves coordinates from location string field', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', location: '31.23,121.47' },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(31.23);
      expect(result.longitude).toBe(121.47);
    });

    it('resolves coordinates from center string field', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', center: '35.0,110.0' },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(35.0);
      expect(result.longitude).toBe(110.0);
    });

    it('resolves coordinates from center object field', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', center: { lat: 28.5, lng: 113.0 } },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(28.5);
      expect(result.longitude).toBe(113.0);
    });

    it('prefers lat/lng over center and location', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', lat: 40.0, lng: 116.0, center: '0,0', location: '1,1' },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(40.0);
      expect(result.longitude).toBe(116.0);
    });

    it('handles swapped lat/lng in coordinate text (longitude first)', async () => {
      // first > 90 means it's likely longitude, swap to lat,lng
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', location: '121.47,31.23' },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(31.23);
      expect(result.longitude).toBe(121.47);
    });

    it('handles coordinate text with string number values', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', lat: '39.9', lng: '116.4' },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(39.9);
      expect(result.longitude).toBe(116.4);
    });

    it('uses latitude/longitude field names', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', latitude: 39.9, longitude: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.latitude).toBe(39.9);
      expect(result.longitude).toBe(116.4);
    });

    it('uses lon field as fallback for longitude', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', lat: 39.9, lon: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.longitude).toBe(116.4);
    });

    it('ranks exact name match higher than partial match', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'Xinyang', adcode: '411500', lat: 32.1, lng: 114.0 },
          { name: 'Xinyangshi', adcode: '411501', lat: 32.2, lng: 114.1 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Xinyang');

      expect(result.city).toBe('Xinyang');
      expect(result.latitude).toBe(32.1);
    });

    it('ranks contains-match above no-match items', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'OtherPlace', adcode: '000001', lat: 10.0, lng: 10.0 },
          { name: 'North Beijing District', adcode: '110101', lat: 40.0, lng: 116.5 },
          { name: 'Beijing', adcode: '110000', lat: 39.9, lng: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Beijing');

      expect(result.city).toBe('Beijing');
      expect(result.latitude).toBe(39.9);
    });

    it('falls back to input keyword when name is missing', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { adcode: '110000', lat: 39.9, lng: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Beijing');

      expect(result.city).toBe('Beijing');
    });

    it('sets adcode to undefined when not a string', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'TestCity', adcode: 110000, lat: 39.9, lng: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('TestCity');

      expect(result.adcode).toBeUndefined();
    });

    it('handles results nested in data.list', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeDataListBody([
          { name: 'Beijing', adcode: '110000', lat: 39.9, lng: 116.4 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Beijing');

      expect(result.latitude).toBe(39.9);
      expect(result.city).toBe('Beijing');
    });

    it('handles results as data array directly', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeDataArrayBody([
          { name: 'Shanghai', adcode: '310000', lat: 31.23, lng: 121.47 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Shanghai');

      expect(result.latitude).toBe(31.23);
      expect(result.city).toBe('Shanghai');
    });

    it('handles results nested in data.results', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeDataResultsBody([
          { name: 'Guangzhou', adcode: '440100', lat: 23.13, lng: 113.26 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Guangzhou');

      expect(result.latitude).toBe(23.13);
      expect(result.city).toBe('Guangzhou');
    });

    it('is case-insensitive for exact match scoring', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'xinyangshi', adcode: '411501', lat: 32.2, lng: 114.1 },
          { name: 'Xinyang', adcode: '411500', lat: 32.1, lng: 114.0 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('Xinyang');

      // "xinyangshi".toLowerCase() !== "xinyang" => score 0 (no contains either)
      // "Xinyang".toLowerCase() === "xinyang" => score 2 (exact)
      expect(result.city).toBe('Xinyang');
      expect(result.adcode).toBe('411500');
    });

    it('calls fetchDistrictByAdcode with correct params', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'Test', lat: 1.0, lng: 1.0 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await resolveDistrictLocationByKeyword('  Test  ');

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('keyword=Test');
      expect(calledUrl).toContain('subdistrict=0');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('page_size=10');
    });

    it('propagates fetchDistrictByAdcode errors', async () => {
      mockNetFetch.mockResolvedValue({
        ok: false,
        status: 500,
        body: 'Internal Server Error',
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      await expect(resolveDistrictLocationByKeyword('Test'))
        .rejects.toThrow('HTTP 500');
    });

    it('skips items with invalid coordinate text (< 2 parts)', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'BadCity', location: '39.9' },
          { name: 'GoodCity', lat: 31.0, lng: 121.0 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('test');

      expect(result.city).toBe('GoodCity');
    });

    it('skips items with non-numeric coordinate text', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'BadCity', location: 'abc,def' },
          { name: 'GoodCity', lat: 31.0, lng: 121.0 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('test');

      expect(result.city).toBe('GoodCity');
    });

    it('skips items with out-of-range coordinate text', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeSuccessBody([
          { name: 'BadCity', location: '999,999' },
          { name: 'GoodCity', lat: 31.0, lng: 121.0 },
        ]),
      });

      const { resolveDistrictLocationByKeyword } = await import('../adcodeApi');
      const result = await resolveDistrictLocationByKeyword('test');

      expect(result.city).toBe('GoodCity');
    });
  });
});
