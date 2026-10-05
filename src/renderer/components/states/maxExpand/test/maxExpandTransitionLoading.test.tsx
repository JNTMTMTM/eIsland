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
 * @file maxExpandTransitionLoading.test.tsx
 * @description maxExpandTransitionLoading 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import Component from '../maxExpandTransitionLoading';
import MaxExpandLoading from '../maxExpandLoading';
import { render, value } from './componentHarness';
const state = vi.hoisted(() => ({ maxExpandTab: 'todo', maxExpandLauncherVisible: true, appModeEnabled: true }));
vi.mock('../../../../store/isLandStore', () => ({ default: (selector: (store: typeof state) => unknown) => selector(state) }));
vi.mock('../hooks/useAppMode', () => ({ useAppMode: () => state }));
vi.mock('../hooks/usePerformanceMode', () => ({ usePerformanceMode: () => true }));
describe('maxExpandTransitionLoading', () => {
  it('shows launcher loading only when both app mode and launcher visibility are enabled', () => {
    const tree = render(Component);
    expect(value(tree, MaxExpandLoading, 'activeTab')).toBe('todo');
    expect(value(tree, MaxExpandLoading, 'performanceModeEnabled')).toBe(true);
    expect(value(tree, MaxExpandLoading, 'launcherVisible')).toBe(true);
    state.appModeEnabled = false;
    expect(value(render(Component), MaxExpandLoading, 'launcherVisible')).toBe(false);
  });
});
