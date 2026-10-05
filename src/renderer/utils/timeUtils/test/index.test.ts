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
import { formatFullTime, formatTime, getDayName } from '../index';

describe('timeUtils', () => {
  it('formats HH:mm with leading zeros', () => {
    const date = new Date(2026, 0, 5, 7, 3, 9);
    expect(formatTime(date)).toBe('07:03');
  });

  it('formats full time as YY-MM-DD HH:mm:ss', () => {
    const date = new Date(2026, 10, 9, 18, 4, 6);
    expect(formatFullTime(date)).toBe('26-11-09 18:04:06');
  });

  it('returns localized day name', () => {
    const date = new Date('2026-05-17T12:00:00');
    expect(getDayName(date)).toBe('周日');
  });
});
