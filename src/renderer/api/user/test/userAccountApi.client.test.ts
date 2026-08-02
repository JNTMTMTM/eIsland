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
 * @file userAccountApi.client.test.ts
 * @description userAccountApi.client 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { netFetchMock, updaterVersionMock } = vi.hoisted(() => {
  const netFetchMock = vi.fn();
  const updaterVersionMock = vi.fn();
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: { hostname: 'localhost' },
      api: {
        netFetch: netFetchMock,
        updaterVersion: updaterVersionMock,
      },
    },
    configurable: true,
    writable: true,
  });
  return { netFetchMock, updaterVersionMock };
});

vi.mock('../../utils/security', () => ({
  buildReplayHeaders: vi.fn(() => ({
    'X-Timestamp': '1234567890',
    'X-Nonce': 'abcdef1234567890abcdef1234567890',
  })),
}));

describe('userAccountApi.client', () => {
  beforeEach(() => {
    vi.resetModules();
    netFetchMock.mockReset();
    updaterVersionMock.mockReset();
  });

  describe('USER_ACCOUNT_API_BASE', () => {
    it('exports USER_ACCOUNT_API_BASE constant', async () => {
      const mod = await import('../userAccountApi.client');
      expect(mod.USER_ACCOUNT_API_BASE).toBeDefined();
      expect(typeof mod.USER_ACCOUNT_API_BASE).toBe('string');
      expect(mod.USER_ACCOUNT_API_BASE).toMatch(/^https?:\/\//);
    });

    it('uses production server', async () => {
      const mod = await import('../userAccountApi.client');
      expect(mod.USER_ACCOUNT_API_BASE).toBe('https://test.server.pyisland.com/api');
    });
  });

  describe('parsePayload', () => {
    it('returns ok=true for code 200 response', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload<{ name: string }>(
        JSON.stringify({ code: 200, data: { name: 'test' } }),
      );
      expect(result.ok).toBe(true);
      expect(result.code).toBe(200);
      expect(result.message).toBe('success');
      expect(result.data).toEqual({ name: 'test' });
    });

    it('returns ok=false for non-200 code', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload(
        JSON.stringify({ code: 401, message: '未授权' }),
      );
      expect(result.ok).toBe(false);
      expect(result.code).toBe(401);
      expect(result.message).toBe('未授权');
    });

    it('returns default "failed" message when non-200 code has no message', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload(
        JSON.stringify({ code: 500 }),
      );
      expect(result.ok).toBe(false);
      expect(result.code).toBe(500);
      expect(result.message).toBe('failed');
    });

    it('handles missing code field by treating as 0', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload(
        JSON.stringify({ data: { x: 1 } }),
      );
      expect(result.ok).toBe(false);
      expect(result.code).toBe(0);
      expect(result.message).toBe('failed');
      expect(result.data).toEqual({ x: 1 });
    });

    it('returns error result on invalid JSON', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload('not-valid-json{{');
      expect(result.ok).toBe(false);
      expect(result.code).toBe(-1);
      expect(result.message).toBe('响应解析失败');
    });

    it('handles empty string input', async () => {
      const { parsePayload } = await import('../userAccountApi.client');
      const result = parsePayload('');
      expect(result.ok).toBe(false);
      expect(result.code).toBe(-1);
      expect(result.message).toBe('响应解析失败');
    });
  });

  describe('request', () => {
    it('constructs request path with base URL and default GET method', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: { id: 1 } }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile');

      expect(netFetchMock).toHaveBeenCalledOnce();
      const [url, opts] = netFetchMock.mock.calls[0];
      expect(url).toBe('https://test.server.pyisland.com/api/v1/user/profile');
      expect(opts.method).toBe('GET');
    });

    it('attaches Content-Type and X-App-Name headers', async () => {
      updaterVersionMock.mockResolvedValue('1.2.3');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile');

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers['X-App-Name']).toBe('eisland');
    });

    it('attaches Authorization header when auth is provided', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile', { auth: 'my-token' });

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer my-token');
    });

    it('attaches X-Client-Version header when version is available', async () => {
      updaterVersionMock.mockResolvedValue('2.5.0');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile');

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.headers['X-Client-Version']).toBe('2.5.0');
    });

    it('omits X-Client-Version header when version is unavailable', async () => {
      updaterVersionMock.mockResolvedValue(null);
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile');

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.headers['X-Client-Version']).toBeUndefined();
    });

    it('uses custom method from init', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      await request('/v1/user/profile', { method: 'POST' });

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.method).toBe('POST');
    });

    it('stringifies body when provided', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify({ code: 200, data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      const body = { email: 'test@example.com' };
      await request('/v1/user/login', { method: 'POST', body });

      const [, opts] = netFetchMock.mock.calls[0];
      expect(opts.body).toBe(JSON.stringify(body));
    });

    it('returns network failure result when netFetch returns null', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue(null);

      const { request } = await import('../userAccountApi.client');
      const result = await request('/v1/user/profile');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(-1);
      expect(result.message).toBe('网络请求失败');
    });

    it('returns HTTP error when response is not ok and parsed code is 0', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        body: JSON.stringify({ data: null }),
      });

      const { request } = await import('../userAccountApi.client');
      const result = await request('/v1/user/profile');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(502);
      expect(result.message).toBe('HTTP 502');
    });

    it('returns parsed result when response is not ok but body has non-zero code', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        body: JSON.stringify({ code: 1001, message: '参数错误' }),
      });

      const { request } = await import('../userAccountApi.client');
      const result = await request('/v1/user/profile');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1001);
      expect(result.message).toBe('参数错误');
    });

    it('catches netFetch exception and returns error result', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockRejectedValue(new Error('timeout'));

      const { request } = await import('../userAccountApi.client');
      const result = await request('/v1/user/profile');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(-1);
      expect(result.message).toBe('timeout');
    });

    it('handles non-Error thrown value with default message', async () => {
      updaterVersionMock.mockResolvedValue('1.0.0');
      netFetchMock.mockRejectedValue('string error');

      const { request } = await import('../userAccountApi.client');
      const result = await request('/v1/user/profile');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(-1);
      expect(result.message).toBe('网络请求失败');
    });
  });
});
