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
 * @file lyricUtilsProgressTime.test.ts
 * @description 歌词页进度条 mm:ss 时间格式：补零、向下取整、超过一小时累加分钟及异常输入。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { formatProgressTime } from '../lyricUtils';

describe('formatProgressTime', () => {
  it.each([
    { ms: 0, expected: '00:00' },
    { ms: 999, expected: '00:00' },
    { ms: 62500, expected: '01:02' },
    { ms: 180000, expected: '03:00' },
    { ms: 599999, expected: '09:59' },
    { ms: 600000, expected: '10:00' },
    { ms: 4503000, expected: '75:03' },
    { ms: 6000000, expected: '100:00' },
    { ms: -5000, expected: '00:00' },
    { ms: Number.NaN, expected: '00:00' },
    { ms: Number.POSITIVE_INFINITY, expected: '00:00' },
  ])('$ms 毫秒格式化为 $expected', ({ ms, expected }) => {
    expect(formatProgressTime(ms)).toBe(expected);
  });
});
