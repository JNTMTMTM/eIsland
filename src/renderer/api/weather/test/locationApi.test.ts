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
 * @file locationApi.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  hoisted mocks                                                     */
/* ------------------------------------------------------------------ */

const { mockNetFetch, mockLoadNetworkConfig, mockLogger } = vi.hoisted(() => ({
  mockNetFetch: vi.fn(),
  mockLoadNetworkConfig: vi.fn(() => ({ timeoutMs: 10000 })),
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

const makeLocationBody = (overrides?: Record<string, unknown>): string => {
  const base = {
    lat: 39.9042,
    lon: 116.4074,
    city: '北京',
    regionName: '北京',
    country: '中国',
  };
  return JSON.stringify({ ...base, ...overrides });
};

/* ------------------------------------------------------------------ */
/*  tests                                                             */
/* ------------------------------------------------------------------ */

describe('locationApi', () => {
  beforeEach(() => {
    vi.resetModules();
    mockNetFetch.mockReset();
    mockLoadNetworkConfig.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();

    mockLoadNetworkConfig.mockReturnValue({ timeoutMs: 10000 });

    setTestWindow({
      api: { netFetch: mockNetFetch },
    });
  });

  /* ============================================================= */
  /*  fetchLocation — success                                       */
  /* ============================================================= */

  describe('fetchLocation', () => {
    it('returns mapped LocationInfo on success', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeLocationBody(),
      });

      const { fetchLocation } = await import('../locationApi');
      const result = await fetchLocation();

      expect(result.latitude).toBe(39.9042);
      expect(result.longitude).toBe(116.4074);
      expect(result.city).toBe('北京');
      expect(result.regionName).toBe('北京');
      expect(result.country).toBe('中国');
    });

    it('preserves country and region codes for shared holiday matching', async () => {
      mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: makeLocationBody({ countryCode: 'US', region: 'CA' }) });
      const { fetchLocation } = await import('../locationApi');
      expect(await fetchLocation()).toMatchObject({ countryCode: 'US', regionCode: 'CA' });
    });

    it('rejects a failed geolocation response instead of caching it', async () => {
      mockNetFetch.mockResolvedValue({ ok: true, status: 200, body: JSON.stringify({ status: 'fail' }) });
      const { fetchLocation } = await import('../locationApi');
      await expect(fetchLocation()).rejects.toThrow('invalid location');
    });

    it('correctly constructs ip-api.com URL with required fields', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeLocationBody(),
      });

      const { fetchLocation } = await import('../locationApi');
      await fetchLocation();

      const calledUrl: string = mockNetFetch.mock.calls[0][0];
      expect(calledUrl).toContain('ip-api.com/json');
      expect(calledUrl).toContain('fields=lat,lon,city,regionName,country');
      expect(calledUrl).toContain('lang=zh-CN');
    });

    it('passes timeoutMs from loadNetworkConfig to netFetch', async () => {
      mockLoadNetworkConfig.mockReturnValue({ timeoutMs: 5000 });
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeLocationBody(),
      });

      const { fetchLocation } = await import('../locationApi');
      await fetchLocation();

      expect(mockNetFetch).toHaveBeenCalledWith(
        expect.any(String),
        { timeoutMs: 5000 },
      );
    });

    it('throws when response is not ok', async () => {
      mockNetFetch.mockResolvedValue({
        ok: false,
        status: 429,
        body: 'Too Many Requests',
      });

      const { fetchLocation } = await import('../locationApi');
      await expect(fetchLocation()).rejects.toThrow('Location API HTTP 429');
    });

    it('truncates error body to 200 characters', async () => {
      const longBody = 'x'.repeat(500);
      mockNetFetch.mockResolvedValue({
        ok: false,
        status: 500,
        body: longBody,
      });

      const { fetchLocation } = await import('../locationApi');
      await expect(fetchLocation()).rejects.toThrow(longBody.slice(0, 200));
    });

    it('throws when response body is not valid JSON', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: '<html>not json</html>',
      });

      const { fetchLocation } = await import('../locationApi');
      await expect(fetchLocation()).rejects.toThrow();
    });

    it('throws when netFetch returns null', async () => {
      mockNetFetch.mockResolvedValue(null);

      const { fetchLocation } = await import('../locationApi');
      await expect(fetchLocation()).rejects.toThrow();
    });

    it('logs request and response', async () => {
      mockNetFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeLocationBody(),
      });

      const { fetchLocation } = await import('../locationApi');
      await fetchLocation();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[LocationApi] request',
        expect.objectContaining({ url: expect.any(String) }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[LocationApi] response',
        expect.objectContaining({ status: 200, ok: true }),
      );
    });
  });
});
