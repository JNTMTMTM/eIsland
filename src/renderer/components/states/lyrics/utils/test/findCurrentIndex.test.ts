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
 * @file findCurrentIndex.test.ts
 * @description 同步歌词二分定位覆盖空列表、起点前、精确边界、中间、末尾及相同时间戳。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { findCurrentIndex } from '../findCurrentIndex';
import type { SyncedLyricLine } from '../../../../../store/types';
const lyrics: SyncedLyricLine[] = [100, 200, 300, 400].map((timeMs) => ({ time_ms: timeMs, text: 'line' }));
describe('current lyric binary search', () => {
  it('空列表与起点前返回-1', () => {
    expect(findCurrentIndex([], 0)).toBe(-1);
    expect(findCurrentIndex(lyrics, 99)).toBe(-1);
  });
  it.each([[100, 0], [199, 0], [200, 1], [250, 1], [399, 2], [400, 3], [999, 3]])('播放%sms返回索引%s', (time, expected) => {
    expect(findCurrentIndex(lyrics, time)).toBe(expected);
  });
  it('同时间戳取最后一行，单行保持0', () => {
    expect(findCurrentIndex([{ time_ms: 100, text: 'a' }, { time_ms: 100, text: 'b' }], 100)).toBe(1);
    expect(findCurrentIndex([lyrics[0]], 100)).toBe(0);
  });
});
