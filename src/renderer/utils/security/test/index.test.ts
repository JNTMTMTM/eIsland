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
 * @description 单元测试文件
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { buildReplayHeaders, createReplayNonce } from '../index';

describe('security utils', () => {
  it('creates 16-byte hex nonce', () => {
    const nonce = createReplayNonce();
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it('builds replay headers with given names and timestamp', () => {
    const headers = buildReplayHeaders('x-ts', 'x-nonce', 1234567890);
    expect(headers['x-ts']).toBe('1234567890');
    expect(headers['x-nonce']).toMatch(/^[0-9a-f]{32}$/);
  });
});
