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
 * @file trayUserSummary.test.ts
 * @description 托盘用户摘要读取本地登录态、Pro 判定与日期格式化测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTrayDate, readTrayUserSummary } from '../trayUserSummary';

const storage = new Map<string, string>();

/**
 * 生成携带指定角色的 JWT 形态 token。
 * @param role - token 中的角色。
 * @returns 测试 token。
 */
function tokenWithRole(role: string): string {
  return `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
}

/**
 * 写入本地账号资料缓存。
 * @param profile - 需要覆盖的资料字段。
 */
function saveProfile(profile: Record<string, unknown>): void {
  storage.set('user-account-profile', JSON.stringify({
    username: 'island',
    email: 'island@example.com',
    avatar: 'https://cdn.example.com/a.png',
    gender: 'undisclosed',
    genderCustom: null,
    birthday: null,
    createdAt: '2026-01-01T00:00:00',
    ...profile,
  }));
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readTrayUserSummary', () => {
  it.each([
    ['no token or profile', () => undefined],
    ['a profile without token', () => saveProfile({})],
    ['a token without profile', () => storage.set('user-account-token', tokenWithRole('user'))],
  ])('treats %s as signed out', (_label, arrange) => {
    arrange();
    expect(readTrayUserSummary()).toEqual({ loggedIn: false, name: '', avatar: null, email: '', isPro: false, proExpireDate: null });
  });

  it('summarises a regular signed-in user', () => {
    storage.set('user-account-token', tokenWithRole('user'));
    saveProfile({ proExpireAt: null });
    expect(readTrayUserSummary()).toEqual({
      loggedIn: true,
      name: 'island',
      avatar: 'https://cdn.example.com/a.png',
      email: 'island@example.com',
      isPro: false,
      proExpireDate: null,
    });
  });

  it.each([
    ['the profile role', 'user', ' ROLE_PRO '],
    ['the token role', 'ROLE_PRO', undefined],
  ])('detects Pro from %s like the user center', (_label, tokenRole, profileRole) => {
    storage.set('user-account-token', tokenWithRole(tokenRole));
    saveProfile({ role: profileRole, proExpireAt: '2026-12-01T08:00:00' });
    expect(readTrayUserSummary()).toMatchObject({ isPro: true, proExpireDate: '2026-12-01' });
  });

  it('falls back to null for an empty avatar and a corrupt profile cache', () => {
    storage.set('user-account-token', tokenWithRole('user'));
    saveProfile({ avatar: '' });
    expect(readTrayUserSummary().avatar).toBeNull();
    storage.set('user-account-profile', '{broken');
    expect(readTrayUserSummary().loggedIn).toBe(false);
  });
});

describe('formatTrayDate', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['not-a-date', null],
    ['2026-03-07T23:00:00', '2026-03-07'],
  ])('formats %j as %j', (value, expected) => {
    expect(formatTrayDate(value)).toBe(expected);
  });
});
