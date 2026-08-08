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
 */

/**
 * @file islandTransition.test.ts
 * @description 灵动岛窗口收缩时序配置测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getIslandMorphDuration, getIslandWindowShrinkDelay } from '../islandTransition';

describe('getIslandWindowShrinkDelay', () => {
  it('keeps the old window canvas while a smaller state is animating', () => {
    expect(getIslandWindowShrinkDelay('expanded', 'idle', 'medium')).toBe(700);
    expect(getIslandWindowShrinkDelay('hover', 'idle', 'fast')).toBe(360);
    expect(getIslandWindowShrinkDelay('maxExpand', 'expanded', 'slow')).toBe(1100);
  });

  it('provides a protection duration for shape-mode changes', () => {
    expect(getIslandMorphDuration('slow')).toBe(1100);
    expect(getIslandMorphDuration('medium')).toBe(700);
    expect(getIslandMorphDuration('fast')).toBe(360);
  });

  it('uses zero-area fallbacks when a state is missing from the area map', () => {
    expect(getIslandWindowShrinkDelay('futureState' as never, 'idle', 'medium')).toBe(0);
    expect(getIslandWindowShrinkDelay('idle', 'futureState' as never, 'medium')).toBe(700);
  });

  it('resizes immediately when the target state is not smaller', () => {
    expect(getIslandWindowShrinkDelay('idle', 'hover', 'medium')).toBe(0);
    expect(getIslandWindowShrinkDelay('expanded', 'maxExpand', 'medium')).toBe(0);
  });
});