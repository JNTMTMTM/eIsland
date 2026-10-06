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
 * @file lyricUtilsUnicode.test.ts
 * @description 歌词视觉宽度工具保留现有中英宽度规则并验证emoji、补充平面字符、边界及组合字符不产生半个代理字符。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { truncateByVisualWidth } from '../lyricUtils';
describe('歌词视觉宽度按完整Unicode码点截断', () => {
  it.each([
    { text: '😀', width: 45, expected: '😀' },
    { text: 'A😀B', width: 4, expected: 'A😀B' },
    { text: 'A😀B', width: 3, expected: 'A😀…' },
    { text: '😀😀😀', width: 3, expected: '😀😀…' },
    { text: '歌😀AB', width: 5, expected: '歌😀A…' },
    { text: '😀歌B', width: 4, expected: '😀歌…' },
    { text: 'A𠮷B', width: 4, expected: 'A𠮷B' },
    { text: '', width: 0, expected: '' },
    { text: 'ABC', width: 4, expected: 'ABC' },
    { text: 'ABC', width: 3, expected: 'AB…' },
    { text: '歌曲', width: 5, expected: '歌曲' },
    { text: '歌曲', width: 4, expected: '歌…' },
    { text: 'かな', width: 4, expected: 'か…' },
    { text: '가나', width: 4, expected: '가…' },
    { text: '😀', width: 1, expected: '…' },
    { text: 'A', width: 0, expected: '…' },
    { text: 'e\u0301', width: 3, expected: 'e\u0301' },
  ])('宽度$width、输入$text返回完整字符$expected', ({ text, width, expected }) => {
    expect(truncateByVisualWidth(text, width)).toBe(expected);
  });
});
