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
 * @file iconMissingInputs.test.ts
 * @description 国家与开发语言图标解析的缺失输入及文件扩展名边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { resolveCountryCode, resolveCountryIcon } from '../country-icon';
import { resolveDevIconByFileName, resolveDevIconByLanguage, resolveDevIconLanguage } from '../dev-icon';

describe('icon missing runtime inputs', () => {
  it.each([null, undefined])('keeps missing input %s in the existing empty fallback', (input) => {
    expect(Reflect.apply(resolveCountryCode, undefined, [input])).toBe('');
    expect(Reflect.apply(resolveCountryIcon, undefined, [input])).toBeUndefined();
    expect(Reflect.apply(resolveDevIconLanguage, undefined, [input])).toBe('plaintext');
    expect(Reflect.apply(resolveDevIconByLanguage, undefined, [input])).toBeUndefined();
    expect(Reflect.apply(resolveDevIconByFileName, undefined, [input])).toBeUndefined();
  });

  it.each([
    ['main.c++', '../svg/devicons/cplusplus-original.svg'],
    ['main.cs', '../svg/devicons/csharp-original.svg'],
    ['main.TSX', '../svg/devicons/react-original.svg'],
    ['main.unknown', undefined],
    ['main.', undefined],
    ['main.ts/path', undefined],
  ])('resolves only the final supported extension of %s', (fileName, expected) => {
    expect(resolveDevIconByFileName(fileName)).toBe(expected);
  });
});
