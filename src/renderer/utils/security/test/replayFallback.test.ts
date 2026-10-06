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
 * @file replayFallback.test.ts
 * @description 防重放随机串在 WebCrypto 缺失或随机 API 不可用时的真实回退测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReplayHeaders, createReplayNonce } from '../index';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('replay nonce capability fallback', () => {
  it.each([{ provider: undefined }, { provider: {} }])('uses the legacy random source for crypto=$provider', ({ provider }) => {
    vi.stubGlobal('crypto', provider);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(createReplayNonce()).toBe('80808080808080808080808080808080');
    expect(random).toHaveBeenCalledTimes(16);
    expect(buildReplayHeaders('timestamp', 'nonce', 1234)).toEqual({ timestamp: '1234', nonce: '80808080808080808080808080808080' });
  });
});
