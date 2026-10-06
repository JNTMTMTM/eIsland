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
 * @file worldClockFlag.test.tsx
 * @description WorldClockFlag 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, value } from '../../../../test/componentHarness';
import { WorldClockFlag as Component } from '../WorldClockFlag';

describe('WorldClockFlag', () => {
  it('omits missing and unknown country flags and loads valid SVG lazily', () => {
    expect(render(Component)).toBeNull();
    expect(render(Component, { countryCode: 'unknown' })).toBeNull();
    const tree = render(Component, { countryCode: 'cn' });
    expect(value(tree, 'img', 'src')).toContain('/cn.svg');
    expect(value(tree, 'img', 'loading')).toBe('lazy');
    expect(value(tree, 'img', 'alt')).toBe('');
    expect(value(tree, 'img', 'className')).toContain('no-filter');
  });
});
