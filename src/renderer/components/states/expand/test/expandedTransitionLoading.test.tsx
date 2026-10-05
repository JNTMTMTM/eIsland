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
 * @file expandedTransitionLoading.test.tsx
 * @description 验证展开加载页转换及性能模式转发。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value } from '../../maxExpand/test/componentHarness';
import ExpandedTransitionLoading from '../expandedTransitionLoading';
import IslandPageLoading from '../../../components/islandPageLoading';
import type { ExpandTab } from '../../../../store/types';

const mocks = vi.hoisted<{ tab: ExpandTab; performance: boolean }>(() => ({ tab: 'hover', performance: false }));
vi.mock('../../../../store/isLandStore', () => ({ default: (selector: (state: { expandTab: ExpandTab }) => unknown) => selector({ expandTab: mocks.tab }) }));
vi.mock('../../maxExpand/hooks/usePerformanceMode', () => ({ usePerformanceMode: () => mocks.performance }));

describe('ExpandedTransitionLoading', () => {
  it.each(['hover', 'overview', 'song', 'tools', 'translation', 'performanceMonitor'] as const)('页面 %s 使用正确标题及说明', (tab) => {
    mocks.tab = tab;
    const tree = render(ExpandedTransitionLoading);
    const expected = tab === 'hover' ? 'overview' : tab;
    expect(value(tree, IslandPageLoading, 'title')).toContain(`expanded.nav.${  expected}`);
    expect(value(tree, IslandPageLoading, 'description')).toBe(`expanded.loadingDescriptions.${  expected}`);
  });
  it.each([true, false])('性能模式 %s 转发至加载组件', (performance) => {
    mocks.performance = performance;
    expect(value(render(ExpandedTransitionLoading), IslandPageLoading, 'performanceModeEnabled')).toBe(performance);
  });
});
