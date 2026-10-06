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
 * @file spotifyTotpVectors.test.ts
 * @description Spotify TOTP 的 RFC 6238 SHA-1 固定向量、预置配置与长密钥 HMAC 边界回归测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTotp, totpGenerateNow } from '../spotifyTotp';

afterEach(() => vi.restoreAllMocks());

describe('Spotify TOTP public contracts', () => {
  it('matches the native HMAC golden for the 70-byte v59 preset', () => {
    vi.spyOn(Date, 'now').mockReturnValue(59000);
    expect(totpGenerateNow(buildTotp(2))).toBe('921688');
  });
  it.each([[0, 61, 60], [1, 60, 46], [2, 59, 70]])('exposes preset %s with version %s and secret length %s', (index, version, length) => {
    expect(buildTotp(index)).toMatchObject({ version, period: 30, digits: 6 });
    expect(buildTotp(index).secret).toHaveLength(length);
  });
  it.each([-1, 3, 0.5, NaN, Infinity, -Infinity])('rejects an unavailable preset index %s', (index) => {
    expect(() => buildTotp(index)).toThrow(`Invalid TOTP index: ${  String(index)}`);
  });
  it.each([
    [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
    [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
  ] as const)('matches RFC 6238 SHA-1 at %s seconds', (seconds, expected) => {
    vi.spyOn(Date, 'now').mockReturnValue(seconds * 1000);
    expect(totpGenerateNow({ secret: new TextEncoder().encode('12345678901234567890'), period: 30, digits: 8, version: 0 })).toBe(expected);
  });
  it.each([[60, '318422'], [64, '968165'], [65, '549712'], [70, '746710'], [120, '238233'], [128, '027443']] as const)('matches independently computed HMAC-SHA1 for %s secret bytes', (length, expected) => {
    vi.spyOn(Date, 'now').mockReturnValue(59000);
    expect(totpGenerateNow({ secret: new Uint8Array(length).fill(65), period: 30, digits: 6, version: 0 })).toBe(expected);
  });
});
