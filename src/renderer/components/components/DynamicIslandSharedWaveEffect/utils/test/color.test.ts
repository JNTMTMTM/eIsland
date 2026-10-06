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
 * @file color.test.ts
 * @description 音浪颜色转换合法大小写、无井号及无效输入回退测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { hexToRgbNorm, SHADER_DEFAULT_BG_RGB } from '../color';

describe('wave shader RGB conversion', () => {
  it.each(['#FF8000', '#ff8000', 'FF8000'])('converts full six-digit color %s into normalized components', (hex) => {
    const [red, green, blue] = hexToRgbNorm(hex);
    expect(red).toBe(1);
    expect(green).toBeCloseTo(128 / 255);
    expect(blue).toBe(0);
  });
  it.each(['', '#fff', '#fffffff', '#GG0000', ' #ffffff ', 'red'])('uses the shader default for unsupported color %j', (hex) => {
    expect(hexToRgbNorm(hex)).toBe(SHADER_DEFAULT_BG_RGB);
  });
});
