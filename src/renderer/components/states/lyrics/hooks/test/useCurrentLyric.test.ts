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
 * @file useCurrentLyric.test.ts
 * @description 当前歌词Hook 保留真实二分索引的加载/前奏/行时间边界、可选逐字音节和依赖缓存测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useCurrentLyric } from '../useCurrentLyric';
import type { SyncedLyricLine } from '../../../../../store/types';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetLifecycle);
const lines: SyncedLyricLine[] = [
  { time_ms: 1000, text: '第一行' },
  { time_ms: 2000, text: '第二行', syllables: [] },
  { time_ms: 3000, text: '逐字行', syllables: [{ start_offset_ms: 0, duration_ms: 1000, text: '逐字' }] },
];
describe('实际当前歌词派生状态', () => {
  it.each([null, []] satisfies Array<SyncedLyricLine[] | null>)('没有歌词%j时无当前行或前奏', (data) => {
    expect(renderWithHooks(() => useCurrentLyric(data, false, 1000))).toEqual({ currentIdx: -1, hasLyrics: false, isIntro: false, currentLine: null, currentText: '', hasSyllables: false });
  });
  it('歌词加载中仍计算已知时间索引，但不发布当前文本；完成加载才显示该行', () => {
    expect(renderWithHooks(() => useCurrentLyric(lines, true, 2000))).toMatchObject({ currentIdx: 1, hasLyrics: false, isIntro: false, currentLine: null, currentText: '' });
    expect(renderWithHooks(() => useCurrentLyric(lines, false, 2000))).toMatchObject({ currentIdx: 1, hasLyrics: true, currentLine: lines[1], currentText: '第二行', hasSyllables: false });
  });
  it('首行之前是前奏，不发布任何文本或音节', () => {
    expect(renderWithHooks(() => useCurrentLyric(lines, false, 999))).toEqual({ currentIdx: -1, hasLyrics: true, isIntro: true, currentLine: null, currentText: '', hasSyllables: false });
  });
  it.each([[1000, 0, '第一行', false], [1999, 0, '第一行', false], [2000, 1, '第二行', false], [3000, 2, '逐字行', true], [9999, 2, '逐字行', true]])('位置%s选择实际行%s及音节状态', (position, index, text, syllables) => {
    expect(renderWithHooks(() => useCurrentLyric(lines, false, position))).toMatchObject({ currentIdx: index, currentLine: lines[index], currentText: text, hasSyllables: syllables, isIntro: false });
  });
  it('更新歌词数组重新匹配当前位置，同一数组位置稳定时保持实际行引用', () => {
    const initial = renderWithHooks(() => useCurrentLyric(lines, false, 3000));
    expect(renderWithHooks(() => useCurrentLyric(lines, false, 3000)).currentLine).toBe(initial.currentLine);
    const next = [{ time_ms: 4000, text: '新歌词' }];
    expect(renderWithHooks(() => useCurrentLyric(next, false, 3000))).toMatchObject({ currentIdx: -1, isIntro: true, currentText: '' });
  });
});
