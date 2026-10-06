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
 * @file useTranslationLyric.test.ts
 * @description 当前翻译歌词 Hook 保留真实二分索引工具的首行之前、时间边界、末行和缺失翻译测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useTranslationLyric } from '../useTranslationLyric';
import type { LyricLine } from '../../../../../api/lyrics/lrcApi';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetLifecycle);
const lines: LyricLine[] = [{ time_ms: 1000, text: '第一行' }, { time_ms: 2500, text: '第二行' }, { time_ms: 4000, text: '末行' }];
describe('实际翻译歌词时间索引', () => {
  it.each([null, []] satisfies Array<LyricLine[] | null>)('缺少翻译行时返回空文本：%j', (translation) => {
    expect(renderWithHooks(() => useTranslationLyric(translation, 0, 3000))).toBe('');
  });
  it('原文尚未进入任何歌词行时不显示翻译，并随原文状态更新重新求值', () => {
    expect(renderWithHooks(() => useTranslationLyric(lines, -1, 3000))).toBe('');
    expect(renderWithHooks(() => useTranslationLyric(lines, 0, 3000))).toBe('第二行');
  });
  it.each([[999, ''], [1000, '第一行'], [2499, '第一行'], [2500, '第二行'], [3999, '第二行'], [4000, '末行'], [9000, '末行']])('位置%s使用真实二分查找返回%s', (position, text) => {
    expect(renderWithHooks(() => useTranslationLyric(lines, 0, position))).toBe(text);
  });
  it('更新翻译文本与当前位置重新匹配，不复用已失效的缓存结果', () => {
    expect(renderWithHooks(() => useTranslationLyric(lines, 2, 4000))).toBe('末行');
    const replacement = [{ time_ms: 1000, text: '新翻译' }];
    expect(renderWithHooks(() => useTranslationLyric(replacement, 2, 4000))).toBe('新翻译');
    expect(renderWithHooks(() => useTranslationLyric(replacement, 2, 999))).toBe('');
  });
});
