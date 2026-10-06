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
 * @file processIndicatorLifecycle.test.tsx
 * @description 验证真实分段进度Hook布局提交、前进后退动画及步骤数重置边界。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects } from '../../../test/contentLifecycleHarness';
import { elements } from '../../../../test/elementHarness';
import { ProcessIndicator } from '../ProcessIndicator';

vi.mock('react', async (load) => ({
  ...await load<typeof import('react')>(), ...lifecycleHooks, useLayoutEffect: lifecycleHooks.useEffect,
}));

/** 布局提交后保存真实进度，再从实际元素读取各段 class。
 * @param total - 可见步骤数。
 * @param current - 当前步骤索引。
 * @returns 实际子段状态class。
 */
function render(total: number, current: number): string[] {
  const tree = renderWithHooks(() => ProcessIndicator({ total, current }));
  runEffects();
  return elements(tree).filter(({ props }) => String(props.className).startsWith('process-indicator-segment')).map(({ props }) => String(props.className));
}

describe('进度指示器真实Hook布局状态和动画', () => {
  beforeEach(resetLifecycle);

  it('首次挂载无动画，前进和后退对真实分段增加enter/exit', () => {
    expect(render(4, 0)).toEqual([
      'process-indicator-segment active', 'process-indicator-segment inactive',
      'process-indicator-segment inactive', 'process-indicator-segment inactive',
    ]);
    expect(render(4, 2)).toEqual([
      'process-indicator-segment completed', 'process-indicator-segment completed enter',
      'process-indicator-segment active enter', 'process-indicator-segment inactive',
    ]);
    expect(render(4, 1)).toEqual([
      'process-indicator-segment completed', 'process-indicator-segment active',
      'process-indicator-segment inactive exit', 'process-indicator-segment inactive',
    ]);
  });

  it('步数改变重置上一布局进度，相同步骤不重复动画', () => {
    render(4, 2);
    expect(render(3, 1)).toEqual([
      'process-indicator-segment completed', 'process-indicator-segment active', 'process-indicator-segment inactive',
    ]);
    expect(render(3, 1)).toEqual([
      'process-indicator-segment completed', 'process-indicator-segment active', 'process-indicator-segment inactive',
    ]);
  });
});
