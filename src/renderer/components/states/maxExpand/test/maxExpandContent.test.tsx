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
 * @file maxExpandContent.test.tsx
 * @description MaxExpandContent 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { Suspense, type ReactElement } from 'react';
import { MaxExpandContent as Component } from '../MaxExpandContent';
import { MaxExpandContentLazy } from '../MaxExpandContentLazy';
import { MaxExpandContentShell } from '../MaxExpandContentShell';
import { renderEagerLoadingTab } from '../utils/renderEagerLoadingTab';
import { render, nodes, value } from './componentHarness';
function Loaded(): null {
  return null
}
const state = vi.hoisted(() => ({ performance: true, loaded: null as (() => null) | null }));
vi.mock('../hooks/usePerformanceMode', () => ({ usePerformanceMode: () => state.performance }));
vi.mock('../hooks/useEagerContentLoader', () => ({ useEagerContentLoader: () => state.loaded }));
vi.mock('../components/setting/utils/performanceSettings', () => ({ readCachedMaxExpandPerformanceModeEnabled: () => true }));
vi.mock('../maxExpandContentEagerLoader', () => ({ loadMaxExpandContentEager: vi.fn(), preloadMaxExpandContentEager: vi.fn() }));
describe('MaxExpandContent', () => {
  it('renders lazy performance mode or loaded eager content and falls back to Suspense', () => {
    const performance = render(Component) as ReactElement;
    expect(performance.type).toBe(MaxExpandContentLazy);
    state.performance = false; state.loaded = Loaded;
    expect((render(Component) as ReactElement).type).toBe(Loaded);
    state.loaded = null;
    const loading = render(Component);
    expect(nodes(loading, Suspense)).toHaveLength(1);
    const fallback = value(loading, Suspense, 'fallback') as ReactElement<Record<string, unknown>>;
    expect(fallback.type).toBe(MaxExpandContentShell);
    expect(fallback.props.renderActiveTab).toBe(renderEagerLoadingTab);
  });
});

vi.mock('../MaxExpandContentShell', () => ({ MaxExpandContentShell: () => null }));
