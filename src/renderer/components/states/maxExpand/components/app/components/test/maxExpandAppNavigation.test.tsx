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
 * @file maxExpandAppNavigation.test.tsx
 * @description MaxExpandAppNavigation 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import Component from '../MaxExpandAppNavigation';
import MaxExpandAppLauncher from '../MaxExpandAppLauncher';
import MaxExpandAppControls from '../../../MaxExpandAppControls';
const state = vi.hoisted(() => ({ transition: null as { direction: string; tab: string } | null, selectApp: vi.fn(), backToLauncher: vi.fn() }));
vi.mock('../../hooks/useAppNavigationTransition', () => ({ useAppNavigationTransition: () => state }));
describe('MaxExpandAppNavigation', () => {
  const props = { activeTab: 'todo', launcherVisible: true, animationEnabled: true, contentActive: true, onBackToExpanded: vi.fn(), children: 'content' };
  it('keeps launcher and application mutually accessible during transitions', () => {
    const tree = render(Component, props);
    expect(value(tree, '.max-expand-app-launcher-layer', 'inert')).toBe(false);
    expect(nodes(tree, '.max-expand-app-application-layer')).toHaveLength(0);
    expect(value(tree, MaxExpandAppLauncher, 'interactive')).toBe(true);
    state.transition = { direction: 'open', tab: 'todo' };
    const transition = render(Component, { ...props, launcherVisible: false });
    expect(value(transition, '.max-expand-app-launcher-layer', 'aria-hidden')).toBe(true);
    expect(value(transition, '.max-expand-app-application-layer', 'inert')).toBe(true);
    expect(value(transition, MaxExpandAppLauncher, 'interactive')).toBe(false);
    expect(value(transition, MaxExpandAppControls, 'onBackToLauncher')).toBe(state.backToLauncher);
    state.transition = null;
    expect(value(render(Component, { ...props, launcherVisible: false }), '.max-expand-app-application-layer', 'inert')).toBe(false);
  });
});
