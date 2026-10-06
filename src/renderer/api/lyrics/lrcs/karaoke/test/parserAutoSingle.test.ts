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
 * @file parserAutoSingle.test.ts
 * @description 逐字歌词自动布局选择忽略整行回退文本，保留前缀及后缀单音节的回归测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseSyncedLines } from '../parsers';

describe('auto layout single syllable regression', () => {
  it.each(['<0,500,0>Hello', '(0,500)Hello', 'Hello<0,500,0>', 'Hello(0,500)'])('retains actual syllables for %s', (segment) => {
    expect(parseSyncedLines(`[1000,500]${  segment}`, 'auto', 'relative')).toEqual([
      { time_ms: 1000, duration_ms: 500, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 500, text: 'Hello' }] },
    ]);
  });

  it.each(['<0,500,0>Hello', 'Hello<0,500,0>'])('does not score an untimed line against real syllable text in %s', (segment) => {
    const result = parseSyncedLines(`[0,500]A long untimed fallback line\n[1000,500]${  segment}`, 'auto', 'relative');
    expect(result[0]).toMatchObject({ text: 'A long untimed fallback line', syllables: [] });
    expect(result[1]).toMatchObject({ text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 500, text: 'Hello' }] });
  });

  it('preserves untimed fallback text and the existing suffix selection on equal syllable scores', () => {
    expect(parseSyncedLines('[1000,500]untimed', 'auto', 'relative')).toEqual([
      { time_ms: 1000, duration_ms: 500, text: 'untimed', syllables: [] },
    ]);
  });
});
