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
 * @file createGradientColors.test.ts
 * @description 时钟渐变的灰阶、各色相区间、亮度边界和非法颜色测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { createGradientColors } from '../createGradientColors';

describe('clock gradient colors', () => {
  it.each([
    ['#000000', '#1a1a1a', '#4d4d4d'],
    ['#ffffff', '#c7c7c7', '#f0f0f0'],
    ['#808080', '#9a9a9a', '#717171'],
    ['#ff0000', '#ff3388', '#e05e00'],
    ['#00ff00', '#88ff33', '#00e05d'],
    ['#0000ff', '#3388ff', '#5e00e0'],
    ['#ffff00', '#ffaa33', '#83e000'],
    ['#00ffff', '#33ffaa', '#0083e0'],
    ['#ff00ff', '#aa33ff', '#e00083'],
  ])('为%s派生确定的渐变端点', (middle, start, end) => {
    expect(createGradientColors(middle)).toEqual({ start, middle, end });
  });
  it.each(['#ff8080', '#010203', '#FF0015', '#C0C0C0'])('高亮/低亮及大小写输入保留主色%s', (value) => {
    const result = createGradientColors(value);
    expect(result?.middle).toBe(value);
    expect(result?.start).toMatch(/^#[0-9a-f]{6}$/);
    expect(result?.end).toMatch(/^#[0-9a-f]{6}$/);
  });
  it.each(['', 'red', '#fff', '#gg0000', '#1234567', ' #ffffff', '#ffffff '])('拒绝非法格式%j', (value) => {
    expect(createGradientColors(value)).toBeNull();
  });
});
