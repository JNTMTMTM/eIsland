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
 * @file activityHeatmap.test.tsx
 * @description ActivityHeatmap 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, text } from '../../../../test/componentHarness';
import { ActivityHeatmap as Component } from '../ActivityHeatmap';
import type { ReactElement } from 'react';
vi.mock('../../hooks/useCollapsibleContent', () => ({ default: (visible: boolean) => visible }));
vi.mock('../../hooks/useHeatmapGrid', () => ({ useHeatmapGrid: () => ({ totals: { session: 2, tool: 3, prompt: 4 }, months: [] }) }));
vi.mock('../../hooks/useHeatmapScroll', () => ({ useHeatmapScroll: () => ({ scrollRef: { current: null }, todayRef: { current: null } }) }));
describe('ActivityHeatmap', () => {
  it('omits fully collapsed content and retains the chosen metric across toggles', () => {
    expect(render(Component, { heatmap: [], visible: false })).toBeNull();
    const tree = render(Component, { heatmap: [], visible: true, compact: true }) as ReactElement<Record<string, unknown>>;
    expect(tree.props.metric).toBe('session');
    (tree.props.setMetric as (metric: string) => void)('tool');
    const updated = render(Component, { heatmap: [], visible: true }) as ReactElement<Record<string, unknown>>;
    expect(updated.props.metric).toBe('tool');
    const content = render(updated.type, updated.props);
    expect(nodes(content, '.cli-tab-heatmap-metric')).toHaveLength(3);
    expect(text(content)).toContain('maxExpand.cli.heatmap.tool');
  });
});
