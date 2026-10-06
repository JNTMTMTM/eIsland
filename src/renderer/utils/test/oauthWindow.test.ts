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
 * @file oauthWindow.test.ts
 * @description OAuth 登录窗口消息与会话结果测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const {
  pollOAuthResultMock,
  consumeOAuthResultMock,
  getGitHubAuthorizeUrlMock,
  getMicrosoftAuthorizeUrlMock,
  getWechatAuthorizeUrlMock,
  getGiteeAuthorizeUrlMock,
  getKookAuthorizeUrlMock,
  clipboardOpenUrlMock,
  randomUUIDMock,
} = vi.hoisted(() => ({
  pollOAuthResultMock: vi.fn(),
  consumeOAuthResultMock: vi.fn(),
  getGitHubAuthorizeUrlMock: vi.fn(),
  getMicrosoftAuthorizeUrlMock: vi.fn(),
  getWechatAuthorizeUrlMock: vi.fn(),
  getGiteeAuthorizeUrlMock: vi.fn(),
  getKookAuthorizeUrlMock: vi.fn(),
  clipboardOpenUrlMock: vi.fn(),
  randomUUIDMock: vi.fn(),
}));

vi.mock('../../api/user/userAccountApi.oauth', () => ({
  pollOAuthResult: pollOAuthResultMock,
  consumeOAuthResult: consumeOAuthResultMock,
  getGitHubAuthorizeUrl: getGitHubAuthorizeUrlMock,
  getMicrosoftAuthorizeUrl: getMicrosoftAuthorizeUrlMock,
  getWechatAuthorizeUrl: getWechatAuthorizeUrlMock,
  getGiteeAuthorizeUrl: getGiteeAuthorizeUrlMock,
  getKookAuthorizeUrl: getKookAuthorizeUrlMock,
}));

vi.stubGlobal('window', {
  api: { clipboardOpenUrl: clipboardOpenUrlMock },
});
vi.stubGlobal('crypto', { randomUUID: randomUUIDMock });

import {
  openGitHubOAuth,
  openMicrosoftOAuth,
  openWechatOAuth,
  openGiteeOAuth,
  openKookOAuth,
} from '../oauthWindow';

describe('oauthWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    randomUUIDMock.mockReturnValue('test-session-id');
    clipboardOpenUrlMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Helper: advance timer and flush microtasks for one poll cycle. */
  async function advanceOnePoll(): Promise<void> {
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
  }

  describe.each([
    { name: 'openGitHubOAuth', fn: openGitHubOAuth, mock: getGitHubAuthorizeUrlMock },
    { name: 'openMicrosoftOAuth', fn: openMicrosoftOAuth, mock: getMicrosoftAuthorizeUrlMock },
    { name: 'openWechatOAuth', fn: openWechatOAuth, mock: getWechatAuthorizeUrlMock },
    { name: 'openGiteeOAuth', fn: openGiteeOAuth, mock: getGiteeAuthorizeUrlMock },
    { name: 'openKookOAuth', fn: openKookOAuth, mock: getKookAuthorizeUrlMock },
  ])('$name', ({ fn, mock }) => {
    it('returns null when authorize URL request fails', async () => {
      mock.mockResolvedValueOnce({ ok: false, code: 500 });

      const result = await fn();
      expect(result).toBeNull();
    });

    it('returns null when authorizeUrl is missing', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: {} });

      const result = await fn();
      expect(result).toBeNull();
    });

    it('opens browser with state parameter', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth' } });
      pollOAuthResultMock.mockResolvedValue({ ok: true, code: 200, data: { ready: false } });

      const promise = fn();
      // Let the first poll cycle run then abort
      await advanceOnePoll();

      expect(clipboardOpenUrlMock).toHaveBeenCalledWith('https://example.com/auth?state=test-session-id');
    });

    it('appends state with & when URL already has query params', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth?foo=bar' } });
      pollOAuthResultMock.mockResolvedValue({ ok: true, code: 200, data: { ready: false } });

      const promise = fn();
      await advanceOnePoll();

      expect(clipboardOpenUrlMock).toHaveBeenCalledWith('https://example.com/auth?foo=bar&state=test-session-id');

      // Clean up: exhaust the promise (it will timeout, that's fine)
      for (let i = 0; i < 150; i++) {
        vi.advanceTimersByTime(2000);
      }
      await vi.runAllTimersAsync();
    });

    it('returns data when poll succeeds and consume returns data', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth' } });
      pollOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: { ready: false } });
      pollOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: { ready: true } });
      const callbackData = { status: 'LOGIN' as const, message: 'ok', token: 'abc' };
      consumeOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: callbackData });

      const promise = fn();
      await advanceOnePoll(); // first poll: not ready
      await advanceOnePoll(); // second poll: ready

      const result = await promise;
      expect(result).toEqual(callbackData);
    });

    it('returns null when consume fails after poll succeeds', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth' } });
      pollOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: { ready: true } });
      consumeOAuthResultMock.mockResolvedValueOnce({ ok: false, code: 500 });

      const promise = fn();
      await advanceOnePoll();

      const result = await promise;
      expect(result).toBeNull();
    });

    it('returns null on timeout', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth' } });
      pollOAuthResultMock.mockResolvedValue({ ok: true, code: 200, data: { ready: false } });

      const promise = fn();
      // Exhaust all poll attempts
      for (let i = 0; i < 150; i++) {
        vi.advanceTimersByTime(2000);
      }
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeNull();
    });

    it('continues polling after network error', async () => {
      mock.mockResolvedValueOnce({ ok: true, code: 200, data: { authorizeUrl: 'https://example.com/auth' } });
      pollOAuthResultMock.mockRejectedValueOnce(new Error('network'));
      pollOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: { ready: true } });
      const callbackData = { status: 'LOGIN' as const, message: 'ok', token: 'abc' };
      consumeOAuthResultMock.mockResolvedValueOnce({ ok: true, code: 200, data: callbackData });

      const promise = fn();
      await advanceOnePoll(); // first poll: network error
      await advanceOnePoll(); // second poll: ready

      const result = await promise;
      expect(result).toEqual(callbackData);
    });
  });
});
