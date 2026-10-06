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
 * @file gif-icon.test.ts
 * @description 动态图标资源导出测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { GifIcon } from '../gif-icon';

describe('GifIcon', () => {
  it('should contain expected keys', () => {
    expect(GifIcon).toHaveProperty('CLAWD_IDLE');
    expect(GifIcon).toHaveProperty('CLAWD_REVIEW');
    expect(GifIcon).toHaveProperty('CLAWD_WAITING');
    expect(GifIcon).toHaveProperty('CLAWD_WAVING');
  });

  it('all values should be strings starting with ../gif/ and ending with .gif', () => {
    Object.entries(GifIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\.\/gif\/.+\.gif$/);
    });
  });

  it('should contain exactly 4 keys', () => {
    expect(Object.keys(GifIcon)).toHaveLength(4);
  });
});
