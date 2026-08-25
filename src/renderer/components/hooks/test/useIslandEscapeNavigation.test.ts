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
 * @file useIslandEscapeNavigation.test.ts
 * @description Escape 键层级返回逻辑单元测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getEscapeNavigationTarget } from '../useIslandEscapeNavigation';

describe('getEscapeNavigationTarget', () => {
  it('returns the previous interactive state for Escape navigation', () => {
    expect(getEscapeNavigationTarget('maxExpand')).toBe('expanded');
    expect(getEscapeNavigationTarget('expanded')).toBe('hover');
    expect(getEscapeNavigationTarget('questionnaire')).toBe('hover');
    expect(getEscapeNavigationTarget('hover')).toBe('idle');
  });

  it('ignores states outside the Escape navigation chain', () => {
    expect(getEscapeNavigationTarget('idle')).toBeNull();
    expect(getEscapeNavigationTarget('notification')).toBeNull();
    expect(getEscapeNavigationTarget('lyrics')).toBeNull();
  });
});