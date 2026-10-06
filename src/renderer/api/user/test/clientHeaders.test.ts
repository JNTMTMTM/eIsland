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
 * @file clientHeaders.test.ts
 * @description 账号客户端真实防重放头、角色静态节点、版本缓存、开发域名与响应解析测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.fn();
const version = vi.fn();
const storage = vi.fn();

/**
 * 构建真实 base64url 载荷，走生产 JWT 解析而非预设角色结果。
 * @param payload - JSON 可序列化角色载荷，含损坏字段测试。
 * @returns 测试令牌。
 */
function token(payload: unknown): string {
  return `header.${  Buffer.from(JSON.stringify(payload)).toString('base64url')  }.signature`;
}

beforeEach(() => {
  vi.resetModules();
  net.mockReset().mockResolvedValue({ ok: true, status: 200, body: '{"code":200,"data":null}' });
  version.mockReset().mockResolvedValue(' 1.2.3 ');
  storage.mockReset().mockReturnValue(null);
  vi.stubGlobal('window', { location: { hostname: 'app.local' }, api: { netFetch: net, updaterVersion: version } });
  vi.stubGlobal('localStorage', { getItem: storage });
});
afterEach(() => vi.unstubAllGlobals());

describe('client domain and version resolution', () => {
  it.each([{ hostname: 'localhost', expected: 'test.server.pyisland.com' }, { hostname: '127.0.0.1', expected: 'test.server.pyisland.com' }, { hostname: 'app.local', expected: 'server.pyisland.com' }])('resolves renderer $hostname and keeps OAuth production domain', async ({ hostname, expected }) => {
    vi.stubGlobal('window', { location: { hostname }, api: { netFetch: net, updaterVersion: version } });
    const client = await import('../userAccountApi.client');
    expect(client.USER_ACCOUNT_API_BASE).toBe(`https://${  expected  }/api`);
    await client.githubRequest('/auth/oauth/providers');
    expect(net).toHaveBeenCalledWith('https://server.pyisland.com/api/auth/oauth/providers', expect.objectContaining({ method: 'GET', timeoutMs: 10000 }));
  });
  it('loads without a renderer and returns null when its bridge is absent', async () => {
    vi.stubGlobal('window', undefined);
    const client = await import('../userAccountApi.client');
    expect(client.USER_ACCOUNT_API_BASE).toBe('https://server.pyisland.com/api');
    expect(await client.resolveClientVersion()).toBeNull();
  });
  it('caches only a trimmed nonempty version', async () => {
    const client = await import('../userAccountApi.client');
    expect(await client.resolveClientVersion()).toBe('1.2.3');
    expect(await client.resolveClientVersion()).toBe('1.2.3');
    expect(version).toHaveBeenCalledTimes(1);
  });
  it.each([{ raw: ' ' }, { raw: null }, { raw: 3 }])('retries uncached invalid version $raw and omits its header', async ({ raw }) => {
    version.mockResolvedValue(raw);
    const client = await import('../userAccountApi.client');
    expect(await client.resolveClientVersion()).toBeNull();
    const headers = await client.buildUploadHeaders();
    expect(headers).toEqual({ 'X-App-Name': 'eisland' });
    expect(version).toHaveBeenCalledTimes(2);
  });
  it('contains bridge rejection while constructing version-free upload headers', async () => {
    version.mockRejectedValue(new Error('unavailable'));
    const client = await import('../userAccountApi.client');
    expect(await client.buildUploadHeaders(' ')).toEqual({ 'X-App-Name': 'eisland' });
  });
});

describe('client role-based static asset selection', () => {
  it.each([
    { auth: 'bad', stored: '{"staticAssetNode":"oss"}', expected: 'r2' },
    { auth: 'header..signature', stored: null, expected: 'r2' },
    { auth: 'header.!invalid.signature', stored: null, expected: 'r2' },
    { auth: token(null), stored: null, expected: 'r2' },
    { auth: token({ role: 3 }), stored: null, expected: 'r2' },
    { auth: token({ role: 'normal' }), stored: null, expected: 'r2' },
    { auth: token({ role: 'pro' }), stored: null, expected: 'r2' },
    { auth: token({ role: 'pro' }), stored: '{"staticAssetNode":"r2"}', expected: 'r2' },
    { auth: token({ role: 'pro' }), stored: 'invalid json', expected: 'r2' },
    { auth: token({ role: 'pro' }), stored: '{"staticAssetNode":"unexpected"}', expected: 'r2' },
    { auth: token({ role: 'pro' }), stored: '{"staticAssetNode":"oss"}', expected: 'oss' },
    { auth: `Bearer ${  token({ role: ' ROLE_ADMIN ' })}`, stored: '{"staticAssetNode":"cos"}', expected: 'cos' },
  ])('selects $expected using the real token and storage parser', async ({ auth, stored, expected }) => {
    storage.mockReturnValue(stored);
    const client = await import('../userAccountApi.client');
    const headers = await client.buildUploadHeaders(auth);
    expect(headers['X-Static-Asset-Node']).toBe(expected);
    expect(headers.Authorization).toBe(`Bearer ${  auth}`);
    expect(headers['X-Timestamp']).toMatch(/^\d+$/);
    expect(headers['X-Nonce']).toMatch(/^[a-f\d]{32}$/i);
  });
  it('contains storage read failure for a PRO token', async () => {
    storage.mockImplementation(() => { throw new Error('read failed'); });
    const client = await import('../userAccountApi.client');
    expect((await client.buildUploadHeaders(token({ role: 'pro' })))['X-Static-Asset-Node']).toBe('r2');
  });
});

describe('client mutation replay policy', () => {
  it.each([
    { path: '/auth/user/login', method: 'POST', auth: undefined, replay: true },
    { path: '/auth/user/login/account', method: 'POST', auth: undefined, replay: true },
    { path: '/auth/user/login/email', method: 'POST', auth: undefined, replay: true },
    { path: '/auth/user/token/refresh', method: 'POST', auth: undefined, replay: true },
    { path: '/v1/user/profile', method: 'PUT', auth: 'token', replay: true },
    { path: '/v1/surveys/1', method: 'DELETE', auth: 'token', replay: true },
    { path: '/v1/upload/user-avatar', method: 'POST', auth: 'token', replay: true },
    { path: '/v1/toolbox/image-translations/1', method: 'DELETE', auth: 'token', replay: true },
    { path: '/v1/other', method: 'POST', auth: 'token', replay: false },
    { path: '/v1/user/profile', method: 'POST', auth: undefined, replay: false },
    { path: '/v1/user/profile', method: 'POST', auth: ' ', replay: false },
    { path: '/v1/user/profile', method: 'GET', auth: 'token', replay: false },
  ] as const)('attaches replay=$replay for $method $path', async ({ path, method, auth, replay }) => {
    const client = await import('../userAccountApi.client');
    await client.request(path, { method, auth, body: { a: 1 }, timeoutMs: 1234 });
    const [, options] = net.mock.calls[0] as [string, { headers: Record<string, string>; body: string; timeoutMs: number }];
    expect(Boolean(options.headers['X-Nonce'])).toBe(replay);
    expect(options.body).toBe('{"a":1}');
    expect(options.timeoutMs).toBe(1234);
  });
  it.each([{ body: 'null', code: 0 }, { body: '{"code":"200","message":7}', code: 0 }, { body: '{"code":200,"message":""}', code: 200 }])('parses JSON response boundary $body without accepting a string code', async ({ body, code }) => {
    const client = await import('../userAccountApi.client');
    expect(client.parsePayload(body)).toMatchObject({ code, ok: code === 200, message: code === 200 ? 'success' : 'failed' });
  });
});
