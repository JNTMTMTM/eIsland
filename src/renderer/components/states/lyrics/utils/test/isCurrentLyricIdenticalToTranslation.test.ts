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
 * @file isCurrentLyricIdenticalToTranslation.test.ts
 * @description 当前歌词原文与翻译一致性使用真实时间索引，覆盖缺失、不可用、前奏、错位与严格文本比较。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { isCurrentLyricIdenticalToTranslation } from '../isCurrentLyricIdenticalToTranslation';
import type { TranslationLyricsResult } from '../../../../../api/lyrics/lrcApi';
import type { SyncedLyricLine } from '../../../../../store/types';
const original: SyncedLyricLine[] = [{ time_ms: 1000, text: 'first' }, { time_ms: 2000, text: 'same' }];
const translated: TranslationLyricsResult = { status: 'available', lines: [{ time_ms: 1200, text: '翻译' }, { time_ms: 2500, text: 'same' }] };
describe('当前原文与翻译真实对比', () => {
  it('缺少原文或翻译时不进行一致性回退', () => {
    expect(isCurrentLyricIdenticalToTranslation(null, translated, 3000)).toBe(false);
    expect(isCurrentLyricIdenticalToTranslation(original, null, 3000)).toBe(false);
  });
  it.each(['not-provided', 'not-fetched', 'unsupported'] as const)('翻译状态%s不能按可用翻译处理', (status) => {
    expect(isCurrentLyricIdenticalToTranslation(original, { status, lines: translated.lines }, 3000)).toBe(false);
  });
  it.each([null, []] satisfies Array<TranslationLyricsResult['lines']>)('可用状态但翻译为空%j不回退', (lines) => {
    expect(isCurrentLyricIdenticalToTranslation(original, { lines, status: 'available' }, 3000)).toBe(false);
  });
  it('空原文、原文前奏、翻译前奏分别由真实索引保护', () => {
    expect(isCurrentLyricIdenticalToTranslation([], translated, 3000)).toBe(false);
    expect(isCurrentLyricIdenticalToTranslation(original, translated, 999)).toBe(false);
    expect(isCurrentLyricIdenticalToTranslation(original, translated, 1100)).toBe(false);
  });
  it.each([[1200, false], [2000, false], [2499, false], [2500, true], [9999, true]])('位置%s按各自时间轴得到%s', (position, expected) => {
    expect(isCurrentLyricIdenticalToTranslation(original, translated, position)).toBe(expected);
  });
  it('比较完整原文，不折叠大小写、空白或标点', () => {
    expect(isCurrentLyricIdenticalToTranslation(original, { status: 'available', lines: [{ time_ms: 0, text: 'Same' }] }, 3000)).toBe(false);
    expect(isCurrentLyricIdenticalToTranslation(original, { status: 'available', lines: [{ time_ms: 0, text: 'same ' }] }, 3000)).toBe(false);
  });
});
