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
 * @file musicProviderAuth.types.test.ts
 * @description musicProviderAuth 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MusicProviderId, MusicProviderAuthState, MusicProviderAuthStatus, MusicProviderQrCodeResult } from '../musicProviderAuth';
describe('musicProviderAuth contracts', () => {
  it('fixes MusicProviderId fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MusicProviderId>().toEqualTypeOf<'qishui'>();
    const fixture: MusicProviderId = 'qishui';
    expect(fixture).toBeDefined();
    // @ts-expect-error MusicProviderId 不接受协议集合外的值。
    const invalid: MusicProviderId = 'invalid';
    expect(invalid).toBe('invalid');
  });
  it('fixes MusicProviderAuthState fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MusicProviderAuthState>().toEqualTypeOf<'idle' | 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'rate_limited' | 'mfa_cancelled' | 'error'>();
    const fixture: MusicProviderAuthState = 'idle';
    expect(fixture).toBeDefined();
    // @ts-expect-error MusicProviderAuthState 不接受协议集合外的值。
    const invalid: MusicProviderAuthState = 'invalid';
    expect(invalid).toBe('invalid');
  });
  it('fixes MusicProviderAuthStatus fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MusicProviderAuthStatus>().toEqualTypeOf<{
      provider: MusicProviderId;
      loggedIn: boolean;
      state: MusicProviderAuthState;
      retryAfterMs: number;
      errorCode?: string;
      message?: string;
    }>();
    const fixture: MusicProviderAuthStatus = { provider: 'qishui', loggedIn: false, state: 'idle', retryAfterMs: 0, errorCode: 'sample', message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error MusicProviderAuthStatus.loggedIn 禁止使用契约外字段值。
    const invalid: MusicProviderAuthStatus['loggedIn'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes MusicProviderQrCodeResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MusicProviderQrCodeResult>().toEqualTypeOf<{
      provider: MusicProviderId;
      loggedIn: boolean;
      state: MusicProviderAuthState;
      retryAfterMs: number;
      errorCode?: string;
      message?: string;
      token: string;
      qrContent: string;
      expiresAt: number | null;
    }>();
    const fixture: MusicProviderQrCodeResult = { provider: 'qishui', loggedIn: false, state: 'idle', retryAfterMs: 0, errorCode: 'sample', message: 'sample', token: 'sample', qrContent: 'sample', expiresAt: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error MusicProviderQrCodeResult.loggedIn 禁止使用契约外字段值。
    const invalid: MusicProviderQrCodeResult['loggedIn'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
