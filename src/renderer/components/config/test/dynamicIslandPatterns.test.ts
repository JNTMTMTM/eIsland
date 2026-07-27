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
 * @file dynamicIslandPatterns.test.ts
 * @description Unit tests for shared input validation patterns.
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { EMAIL_PATTERN } from '../dynamicIslandPatterns';

describe('EMAIL_PATTERN', () => {
  it('accepts common email addresses', () => {
    expect(EMAIL_PATTERN.test('user@example.com')).toBe(true);
    expect(EMAIL_PATTERN.test('user.name+tag@example.co.uk')).toBe(true);
    expect(EMAIL_PATTERN.test('u@example.io')).toBe(true);
  });

  it('rejects malformed dot placement', () => {
    expect(EMAIL_PATTERN.test('user..name@example.com')).toBe(false);
    expect(EMAIL_PATTERN.test('.user@example.com')).toBe(false);
    expect(EMAIL_PATTERN.test('user.@example.com')).toBe(false);
    expect(EMAIL_PATTERN.test('user@example..com')).toBe(false);
  });

  it('rejects malformed domains', () => {
    expect(EMAIL_PATTERN.test('user@example')).toBe(false);
    expect(EMAIL_PATTERN.test('user@example.c')).toBe(false);
    expect(EMAIL_PATTERN.test('user@-example.com')).toBe(false);
    expect(EMAIL_PATTERN.test('user@example-.com')).toBe(false);
    expect(EMAIL_PATTERN.test('user@example.c0m')).toBe(false);
  });
});
