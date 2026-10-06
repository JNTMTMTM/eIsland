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
 * @file translationStates.test.ts
 * @description 翻译歌词缺失、未解析与有效同步文本的真实状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { missingTranslationLyrics, parseTranslationLyrics, unresolvedTranslationLyrics, unsupportedTranslationLyrics } from '../translation';

describe('translation lyrics status contracts', () => {
  it.each([null, undefined, '', '   '])('classifies missing text %s', (raw) => {
    expect(parseTranslationLyrics(raw)).toEqual({ status: 'not-provided', lines: null });
  });
  it('keeps unsupported and unresolved states distinct from missing content', () => {
    expect(unsupportedTranslationLyrics()).toEqual({ status: 'unsupported', lines: null });
    expect(unresolvedTranslationLyrics()).toEqual({ status: 'not-fetched', lines: null });
    expect(missingTranslationLyrics()).toEqual({ status: 'not-provided', lines: null });
    expect(parseTranslationLyrics('untimed text')).toEqual({ status: 'not-fetched', lines: null });
  });
  it('returns parsed real timestamps and translation text', () => {
    expect(parseTranslationLyrics('[00:01.50]译文')).toEqual({ status: 'available', lines: [{ time_ms: 1500, text: '译文' }] });
  });
});
