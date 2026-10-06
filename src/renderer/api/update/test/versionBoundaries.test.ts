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
 * @file versionBoundaries.test.ts
 * @description 版本查询和下载计数的 JSON 校验、失败响应、桥接异常与域名测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.fn();
beforeEach(() => {
  vi.resetModules();
  net.mockReset();
  vi.stubGlobal('window', { location: { hostname: 'app.local' }, api: { netFetch: net } });
});
afterEach(() => vi.unstubAllGlobals());

describe('version API boundaries', () => {
  it.each([{ response: { ok: false } }, { response: { ok: true, body: 'invalid json' } }, { response: { ok: true, body: 'null' } }, { response: { ok: true, body: '{"code":500,"data":{"version":"1"}}' } }, { response: { ok: true, body: '{"code":200,"data":null}' } }, { response: { ok: true, body: '{"code":200,"data":{"version":3}}' } }])('rejects invalid version metadata $response', async ({ response }) => {
    net.mockResolvedValueOnce(response);
    const { fetchVersion } = await import('../versionApi');
    expect(await fetchVersion()).toBeNull();
    expect(net).toHaveBeenCalledExactlyOnceWith('https://server.pyisland.com/api/v1/version?appName=eisland', { method: 'GET', timeoutMs: 5000 });
  });
  it.each([{ response: { ok: false } }, { response: { ok: true, body: 'invalid json' } }, { response: { ok: true, body: 'null' } }, { response: { ok: true, body: '{"code":500}' } }])('returns failed download report for $response', async ({ response }) => {
    net.mockResolvedValueOnce(response);
    const { reportUpdateDownloadCount } = await import('../versionApi');
    expect(await reportUpdateDownloadCount(' 1.2.3 ')).toBe(false);
  });
  it('contains rejection for both version query and download report', async () => {
    net.mockRejectedValue(new Error('offline'));
    const { fetchVersion, reportUpdateDownloadCount } = await import('../versionApi');
    expect(await fetchVersion()).toBeNull();
    expect(await reportUpdateDownloadCount('1.2.3')).toBe(false);
  });
  it('uses the loopback development host', async () => {
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1' }, api: { netFetch: net } });
    net.mockResolvedValueOnce({ ok: true, body: '{"code":200,"data":{"version":"1.2.3"}}' });
    const { fetchVersion } = await import('../versionApi');
    expect(await fetchVersion()).toEqual({ version: '1.2.3' });
    expect(net).toHaveBeenCalledExactlyOnceWith('https://test.server.pyisland.com/api/v1/version?appName=eisland', { method: 'GET', timeoutMs: 5000 });
  });
});
