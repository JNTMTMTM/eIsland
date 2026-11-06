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
 * @file nativeFileName.test.ts
 * @description 回归真实旧 Windows OsString 文件名及损坏历史的字符串降级。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import normalizeNativeFileName from '../nativeFileName';

describe('native file name compatibility', () => {
  it('keeps native strings and decodes Windows UTF-16 including surrogate pairs', () => {
    expect(normalizeNativeFileName('archive.zip', 'fallback')).toBe('archive.zip');
    expect(normalizeNativeFileName({ Windows: [0x4e2d, 0x6587, 0xd83d, 0xde80, 46, 122, 105, 112] }, 'fallback')).toBe('中文🚀.zip');
  });
  it.each(['', null, undefined, 1, {}, { Windows: null }, { Windows: 'a.zip' }, { Windows: [] },
    { Windows: ['a'] }, { Windows: [1.5] }, { Windows: [-1] }, { Windows: [0x10000] }])('invalid or empty persisted file name %j falls back to readable text', (value) => {
    expect(normalizeNativeFileName(value, 'https://downloads.test/archive.zip')).toBe('https://downloads.test/archive.zip');
  });
});
