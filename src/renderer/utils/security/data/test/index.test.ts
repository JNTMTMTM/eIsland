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
 * @description 安全认证 Base32 字符表与 TOTP 默认参数导出测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  BASE32_ALPHABET,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_PERIOD_SECONDS,
  DEFAULT_TOTP_HMAC_HASH,
} from '../index';

describe('security data constants', () => {
  it('BASE32_ALPHABET is exactly 32 chars, only A-Z and 2-7', () => {
    expect(BASE32_ALPHABET).toHaveLength(32);
    expect(BASE32_ALPHABET).toMatch(/^[A-Z2-7]+$/);
  });

  it('DEFAULT_TOTP_DIGITS === 6', () => {
    expect(DEFAULT_TOTP_DIGITS).toBe(6);
  });

  it('DEFAULT_TOTP_PERIOD_SECONDS === 30', () => {
    expect(DEFAULT_TOTP_PERIOD_SECONDS).toBe(30);
  });

  it("DEFAULT_TOTP_HMAC_HASH === 'SHA-1'", () => {
    expect(DEFAULT_TOTP_HMAC_HASH).toBe('SHA-1');
  });
});
