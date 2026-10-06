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
 * @file index.test.ts
 * @description 登录会话失效、清理与跨窗口同步测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  fetchUserProfileMock,
  readLocalTokenMock,
  writeLocalTokenMock,
  writeLocalProfileMock,
} = vi.hoisted(() => ({
  fetchUserProfileMock: vi.fn(),
  readLocalTokenMock: vi.fn(),
  writeLocalTokenMock: vi.fn(),
  writeLocalProfileMock: vi.fn(),
}));

vi.mock('../../../api/user/userAccountApi', () => ({
  fetchUserProfile: fetchUserProfileMock,
}));

vi.mock('../../userAccount', () => ({
  USER_ACCOUNT_LOGOUT_MARKER_KEY: 'user-account-logout-marker',
  USER_ACCOUNT_PROFILE_STORAGE_KEY: 'user-account-profile',
  USER_ACCOUNT_TOKEN_STORAGE_KEY: 'user-account-token',
  readLocalToken: readLocalTokenMock,
  writeLocalToken: writeLocalTokenMock,
  writeLocalProfile: writeLocalProfileMock,
}));

import { updateSessionToken, bootstrapAuthSession } from '../index';

describe('authSession', () => {
  let storeReadMock: ReturnType<typeof vi.fn>;
  let localStorageGetItemMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    storeReadMock = vi.fn().mockResolvedValue(null);
    localStorageGetItemMock = vi.fn().mockReturnValue(null);

    Object.defineProperty(globalThis, 'window', {
      value: { api: { storeRead: storeReadMock } },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: localStorageGetItemMock },
      writable: true,
      configurable: true,
    });
  });

  it('updateSessionToken calls writeLocalToken', () => {
    updateSessionToken('test-token');
    expect(writeLocalTokenMock).toHaveBeenCalledWith('test-token');

    updateSessionToken(null);
    expect(writeLocalTokenMock).toHaveBeenCalledWith(null);
  });

  describe('bootstrapAuthSession', () => {
    it('returns early when logout marker is true', async () => {
      storeReadMock.mockResolvedValueOnce(true);

      await bootstrapAuthSession();

      expect(readLocalTokenMock).not.toHaveBeenCalled();
      expect(fetchUserProfileMock).not.toHaveBeenCalled();
    });

    it('restores persisted token when no local token is available', async () => {
      storeReadMock
        .mockResolvedValueOnce(null)   // logout marker
        .mockResolvedValueOnce('persisted-token'); // persisted token
      readLocalTokenMock.mockReturnValue(null);
      localStorageGetItemMock.mockReturnValue(null);
      storeReadMock.mockResolvedValue(null); // profile storeRead
      fetchUserProfileMock.mockResolvedValue({ ok: true, code: 200, message: '', data: null });

      await bootstrapAuthSession();

      expect(writeLocalTokenMock).toHaveBeenCalledWith('persisted-token');
      expect(fetchUserProfileMock).toHaveBeenCalledWith('persisted-token');
    });

    it('writes profile when fetchUserProfile succeeds', async () => {
      const profile = { username: 'test', email: 'test@example.com' };
      storeReadMock.mockResolvedValue(null);
      readLocalTokenMock.mockReturnValue('my-token');
      localStorageGetItemMock.mockReturnValue('cached-profile');
      fetchUserProfileMock.mockResolvedValue({ ok: true, code: 200, message: '', data: profile });

      await bootstrapAuthSession();

      expect(fetchUserProfileMock).toHaveBeenCalledWith('my-token');
      expect(writeLocalProfileMock).toHaveBeenCalledWith(profile);
    });

    it('clears session when fetchUserProfile returns 401', async () => {
      storeReadMock.mockResolvedValue(null);
      readLocalTokenMock.mockReturnValue('expired-token');
      localStorageGetItemMock.mockReturnValue('cached');
      fetchUserProfileMock.mockResolvedValue({ ok: false, code: 401, message: 'Unauthorized' });

      await bootstrapAuthSession();

      expect(writeLocalTokenMock).toHaveBeenCalledWith(null);
      expect(writeLocalProfileMock).toHaveBeenCalledWith(null);
    });

    it('does NOT clear session when fetchUserProfile fails with non-401 error', async () => {
      storeReadMock.mockResolvedValue(null);
      readLocalTokenMock.mockReturnValue('valid-token');
      localStorageGetItemMock.mockReturnValue('cached');
      fetchUserProfileMock.mockResolvedValue({ ok: false, code: 500, message: 'Server Error' });

      await bootstrapAuthSession();

      expect(writeLocalTokenMock).not.toHaveBeenCalledWith(null);
      expect(writeLocalProfileMock).not.toHaveBeenCalledWith(null);
    });

    it('returns without fetching when no token is available at all', async () => {
      storeReadMock.mockResolvedValue(null);
      readLocalTokenMock.mockReturnValue(null);
      localStorageGetItemMock.mockReturnValue(null);

      await bootstrapAuthSession();

      expect(fetchUserProfileMock).not.toHaveBeenCalled();
    });
  });
});
