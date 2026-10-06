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
 * @file useKaraokeScrollProgress.test.ts
 * @description 逐字歌词滚动进度Hook 的真实当前行派生输入、未知时长、进度限值和缓入缓出测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useCurrentLyric } from '../useCurrentLyric';
import { useKaraokeScrollProgress } from '../useKaraokeScrollProgress';
import type { SyncedLyricLine } from '../../../../../store/types';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetLifecycle);
const line: SyncedLyricLine = { time_ms: 1000, text: '逐字歌词', syllables: [{ start_offset_ms: 0, duration_ms: 1000, text: '逐字' }, { start_offset_ms: 1000, duration_ms: 1000, text: '歌词' }] };
/**
 * 使用真实当前行Hook生成生产调用方的关联参数，不编造互相矛盾的hasSyllables/isIntro。
 * @param lyrics - 当前同步歌词。
 * @param position - 当前播放位置。
 * @param enabled - 是否开启逐字模式。
 * @returns 当前平滑滚动进度或禁用值。
 */
function progress(lyrics: SyncedLyricLine[] | null, position: number, enabled = true): number | undefined {
  const current = renderWithHooks(() => useCurrentLyric(lyrics, false, position));
  return useKaraokeScrollProgress(enabled, current.currentLine, current.hasSyllables, current.isIntro, position);
}
describe('真实逐字行滚动参数', () => {
  it('逐字模式关闭、无歌词、前奏和无音节时回退普通往返滚动', () => {
    expect(progress([line], 1500, false)).toBeUndefined(); expect(progress(null, 1500)).toBeUndefined();
    expect(progress([line], 999)).toBeUndefined(); expect(progress([{ time_ms: 0, text: '普通歌词' }], 1500)).toBeUndefined();
  });
  it('非空音节但时长未知为0时不计算滚动', () => {
    expect(progress([{ time_ms: 0, text: '未知时长', syllables: [{ start_offset_ms: 0, duration_ms: 0, text: '词' }] }], 1000)).toBeUndefined();
  });
  it.each([[1000, 0], [1850, 0.5], [2700, 1], [9999, 1]])('逐字行播放到%s时平滑进度为%s', (position, expected) => {
    expect(progress([line], position)).toBeCloseTo(expected);
  });
});
