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
 * @file sessionRecoveryFailures.test.ts
 * @description 真实会话恢复流程的本地存储失败、三个持久化读取拒绝与 token 更新事件测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapAuthSession, refreshAuthSession, updateSessionToken } from '../index';
import { USER_ACCOUNT_PROFILE_STORAGE_KEY, USER_ACCOUNT_TOKEN_STORAGE_KEY } from '../../userAccount';

const service = vi.hoisted(() => vi.fn());
vi.mock('../../../api/user/userAccountApi', () => ({ fetchUserProfile: service }));
const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();
const read = vi.fn();
const write = vi.fn();
beforeEach(() => {
  service.mockReset().mockResolvedValue({ ok: false, code: 500 });
  get.mockReset().mockReturnValue(null);
  set.mockReset();
  remove.mockReset();
  read.mockReset().mockResolvedValue(null);
  write.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('localStorage', { getItem: get, setItem: set, removeItem: remove });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { storeRead: read, storeWrite: write } }));
});
afterEach(() => vi.unstubAllGlobals());

describe('session recovery boundary failures', () => {
  it('contains rejection of logout marker, persisted token and persisted profile', async () => {
    read.mockRejectedValue(new Error('read IPC unavailable'));
    await expect(bootstrapAuthSession()).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(3);
    expect(service).not.toHaveBeenCalled();
  });
  it('recovers from local profile read failure without replacing a valid local token', async () => {
    get.mockImplementation((key: string) => {
      if (key === USER_ACCOUNT_TOKEN_STORAGE_KEY) return 'local-token';
      throw new Error('profile unavailable');
    });
    await expect(bootstrapAuthSession()).resolves.toBe('local-token');
    expect(read).toHaveBeenCalledWith(USER_ACCOUNT_PROFILE_STORAGE_KEY);
    expect(service).not.toHaveBeenCalled();
  });
  it('writes and clears session token through the real persistence implementation', () => {
    updateSessionToken('new-token');
    expect(set).toHaveBeenCalledWith(USER_ACCOUNT_TOKEN_STORAGE_KEY, 'new-token');
    updateSessionToken(null);
    expect(remove).toHaveBeenCalledWith(USER_ACCOUNT_TOKEN_STORAGE_KEY);
  });
  it('restores a persisted profile through the real local writer even without a token', async () => {
    const profile = { username: 'user', email: 'user@example.com', avatar: null, gender: 'undisclosed', genderCustom: null, birthday: null, createdAt: 'date' };
    read.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(profile);
    await bootstrapAuthSession();
    expect(set).toHaveBeenCalledWith(USER_ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    expect(service).not.toHaveBeenCalled();
  });
  it('clears expired 4011 credentials through both real persistence writers', async () => {
    get.mockImplementation((key: string) => key === USER_ACCOUNT_TOKEN_STORAGE_KEY ? 'expired-token' : 'cached-profile');
    service.mockResolvedValueOnce({ ok: false, code: 4011 });
    const token = await bootstrapAuthSession();
    await refreshAuthSession(token);
    expect(remove).toHaveBeenCalledWith(USER_ACCOUNT_TOKEN_STORAGE_KEY);
    expect(remove).toHaveBeenCalledWith(USER_ACCOUNT_PROFILE_STORAGE_KEY);
  });
  it('restores persisted credentials before a pending profile request and refreshes them later', async () => {
    const profile = { username: 'cached', email: 'cached@example.com' };
    const freshProfile = { ...profile, username: 'fresh' };
    const values = new Map<string, string>();
    get.mockImplementation((key: string) => values.get(key) ?? null);
    set.mockImplementation((key: string, value: string) => values.set(key, value));
    read.mockResolvedValueOnce(null).mockResolvedValueOnce('persisted-token').mockResolvedValueOnce(profile);
    const pending = Promise.withResolvers<{ ok: boolean; code: number; data: typeof profile }>();
    service.mockReturnValue(pending.promise);

    const token = await bootstrapAuthSession();
    expect(token).toBe('persisted-token');
    expect(values.get(USER_ACCOUNT_PROFILE_STORAGE_KEY)).toBe(JSON.stringify(profile));
    expect(service).not.toHaveBeenCalled();

    const refresh = refreshAuthSession(token);
    expect(service).toHaveBeenCalledExactlyOnceWith('persisted-token');
    expect(values.get(USER_ACCOUNT_PROFILE_STORAGE_KEY)).toBe(JSON.stringify(profile));
    pending.resolve({ ok: true, code: 200, data: freshProfile });
    await refresh;
    expect(values.get(USER_ACCOUNT_PROFILE_STORAGE_KEY)).toBe(JSON.stringify(freshProfile));
  });
});
