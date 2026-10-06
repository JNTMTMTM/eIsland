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
 * @file userAccountApi.oauth.test.ts
 * @description OAuth 接口真实调用参数、授权码编码、超时、可选邮箱及传输失败透传测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeOAuthResult, fetchOAuthBindings, fetchOAuthProviders, getGiteeAuthorizeUrl, getGitHubAuthorizeUrl, getKookAuthorizeUrl, getMicrosoftAuthorizeUrl, getWechatAuthorizeUrl, handleGitHubCallback, oauthBindAccount, oauthBindEmail, oauthSetPassword, pollOAuthResult, unbindOAuth, wechatBindEmail } from '../userAccountApi.oauth';

const leaf = vi.hoisted(() => ({ githubRequest: vi.fn(), request: vi.fn() }));
vi.mock('../userAccountApi.client', () => leaf);

beforeEach(() => {
  leaf.githubRequest.mockReset().mockResolvedValue({ ok: true, code: 200, data: { status: 'LOGIN', token: 'login-token' } });
  leaf.request.mockReset().mockResolvedValue({ ok: true, code: 200, data: [] });
});

describe('OAuth authorization and result transport', () => {
  it.each([
    { provider: 'github', authorize: getGitHubAuthorizeUrl },
    { provider: 'microsoft', authorize: getMicrosoftAuthorizeUrl },
    { provider: 'wechat', authorize: getWechatAuthorizeUrl },
    { provider: 'gitee', authorize: getGiteeAuthorizeUrl },
    { provider: 'kook', authorize: getKookAuthorizeUrl },
  ])('requests $provider authorization and returns the transport promise unchanged', ({ provider, authorize }) => {
    const result = authorize();
    expect(leaf.githubRequest).toHaveBeenCalledExactlyOnceWith(`/auth/oauth/${  provider  }/authorize`, { method: 'GET' });
    expect(result).toBe(leaf.githubRequest.mock.results[0].value);
  });
  it.each([
    { callback: handleGitHubCallback, path: '/auth/oauth/github/callback?code=', timeoutMs: 15000 },
    { callback: pollOAuthResult, path: '/auth/oauth/poll?sessionId=', timeoutMs: 5000 },
    { callback: consumeOAuthResult, path: '/auth/oauth/consume?sessionId=', timeoutMs: 5000 },
  ])('encodes the identifier for $path and preserves timeout $timeoutMs', async ({ callback, path, timeoutMs }) => {
    await callback('中 &/?=');
    expect(leaf.githubRequest).toHaveBeenLastCalledWith(`${path  }%E4%B8%AD%20%26%2F%3F%3D`, { timeoutMs, method: 'GET' });
    await callback('');
    expect(leaf.githubRequest).toHaveBeenLastCalledWith(path, { timeoutMs, method: 'GET' });
  });
  it.each([
    { bind: wechatBindEmail, path: '/auth/oauth/wechat/bind-email' },
    { bind: oauthBindEmail, path: '/auth/oauth/bind-email' },
  ])('posts supplemental email to $path without normalizing credentials', async ({ bind, path }) => {
    await bind('temp-token', 'a+b@example.com', '001234');
    expect(leaf.githubRequest).toHaveBeenCalledExactlyOnceWith(path, { method: 'POST', body: { tempToken: 'temp-token', email: 'a+b@example.com', emailCode: '001234' }, timeoutMs: 15000 });
  });
  it.each([{ email: undefined }, { email: '' }, { email: 'account@example.com' }])('registers with optional email $email', async ({ email }) => {
    const result = email === undefined ? await oauthSetPassword('temp-token', 'user', 'password') : await oauthSetPassword('temp-token', 'user', 'password', email);
    expect(leaf.githubRequest).toHaveBeenCalledExactlyOnceWith('/auth/oauth/set-password', { method: 'POST', body: { tempToken: 'temp-token', username: 'user', password: 'password', email: email || undefined }, timeoutMs: 15000 });
    expect(result).toEqual({ ok: true, code: 200, data: { status: 'LOGIN', token: 'login-token' } });
  });
  it('binds the existing account with the temporary credential and password', async () => {
    await oauthBindAccount('temp-token', 'password');
    expect(leaf.githubRequest).toHaveBeenCalledExactlyOnceWith('/auth/oauth/bind', { method: 'POST', body: { tempToken: 'temp-token', password: 'password' }, timeoutMs: 15000 });
  });
  it('uses authenticated transport for bindings and the default public request for providers', async () => {
    await fetchOAuthBindings('token');
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/oauth-bindings', { method: 'GET', auth: 'token' });
    await unbindOAuth('token', 42);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/oauth-bindings/42', { method: 'DELETE', auth: 'token' });
    await fetchOAuthProviders();
    expect(leaf.request).toHaveBeenLastCalledWith('/auth/oauth/providers');
  });
  it('propagates failed OAuth responses and rejected requests without replacing the error', async () => {
    const denied = { ok: false, code: 403, message: 'denied' };
    leaf.githubRequest.mockResolvedValueOnce(denied);
    expect(await consumeOAuthResult('session')).toBe(denied);
    const error = new Error('network unavailable');
    leaf.githubRequest.mockRejectedValueOnce(error);
    await expect(getGitHubAuthorizeUrl()).rejects.toBe(error);
    leaf.request.mockRejectedValueOnce(error);
    await expect(fetchOAuthBindings('token')).rejects.toBe(error);
  });
});
