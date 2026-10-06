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
 * @file accountPersistence.test.ts
 * @description 用户会话本地读写、真实事件订阅、持久化拒绝与损坏 JWT 边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalAccount, emitUserAccountSessionChanged, getRoleFromToken, readLocalProfile, readLocalToken, subscribeUserAccountSessionChanged, USER_ACCOUNT_PROFILE_STORAGE_KEY, USER_ACCOUNT_SESSION_CHANGED_EVENT, USER_ACCOUNT_TOKEN_STORAGE_KEY, writeLocalProfile, writeLocalToken } from '../index';
import type { UserAccountProfile } from '../index';

const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();
const persist = vi.fn();
const profile: UserAccountProfile = { username: 'user', email: 'user@example.com', avatar: null, gender: 'undisclosed', genderCustom: null, birthday: null, createdAt: 'date' };
beforeEach(() => {
  get.mockReset().mockReturnValue(null);
  set.mockReset();
  remove.mockReset();
  persist.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('localStorage', { getItem: get, setItem: set, removeItem: remove });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { storeWrite: persist } }));
});
afterEach(() => vi.unstubAllGlobals());

describe('user session leaf failures', () => {
  it('subscribes and unsubscribes a real event listener without stale notifications', () => {
    const listener = vi.fn();
    const off = subscribeUserAccountSessionChanged(listener);
    emitUserAccountSessionChanged();
    expect(listener).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: USER_ACCOUNT_SESSION_CHANGED_EVENT }));
    off();
    emitUserAccountSessionChanged();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('contains dispatch failure independently of storage success', () => {
    vi.stubGlobal('window', { dispatchEvent: () => { throw new Error('dispatch unavailable'); } });
    expect(emitUserAccountSessionChanged).not.toThrow();
  });
  it('contains every persistence rejection for token/profile writes and clears', async () => {
    persist.mockRejectedValue(new Error('IPC unavailable'));
    const listener = vi.fn();
    const off = subscribeUserAccountSessionChanged(listener);
    writeLocalToken('token');
    writeLocalToken(null);
    writeLocalProfile(profile);
    writeLocalProfile(null);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(persist).toHaveBeenCalledTimes(6);
    expect(listener).toHaveBeenCalledTimes(4);
    off();
  });
  it('contains local storage read/write/remove failures while preserving IPC synchronization', () => {
    get.mockImplementation(() => { throw new Error('read failed'); });
    set.mockImplementation(() => { throw new Error('write failed'); });
    remove.mockImplementation(() => { throw new Error('remove failed'); });
    expect(readLocalToken()).toBeNull();
    expect(readLocalProfile()).toBeNull();
    expect(() => writeLocalToken('token')).not.toThrow();
    expect(() => writeLocalProfile(profile)).not.toThrow();
    expect(clearLocalAccount).not.toThrow();
    expect(persist).toHaveBeenCalledTimes(6);
  });
  it('persists locally even when the optional IPC bridge is unavailable', () => {
    vi.stubGlobal('window', new EventTarget());
    writeLocalToken('token');
    writeLocalProfile(profile);
    expect(set).toHaveBeenCalledWith(USER_ACCOUNT_TOKEN_STORAGE_KEY, 'token');
    expect(set).toHaveBeenCalledWith(USER_ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    clearLocalAccount();
    expect(remove).toHaveBeenCalledWith(USER_ACCOUNT_TOKEN_STORAGE_KEY);
    expect(remove).toHaveBeenCalledWith(USER_ACCOUNT_PROFILE_STORAGE_KEY);
  });
  it.each(['header..signature', 'header.!invalid.signature', `header.${  Buffer.from('null').toString('base64url')  }.signature`])('rejects malformed JWT %s', (token) => {
    expect(getRoleFromToken(token)).toBeNull();
  });
  it('returns no role for absent credentials or a non-string role field', () => {
    expect(getRoleFromToken(null)).toBeNull();
    expect(getRoleFromToken(undefined)).toBeNull();
    const encoded = Buffer.from('{"role":3}').toString('base64url');
    expect(getRoleFromToken(`header.${encoded}.signature`)).toBeNull();
  });
});
