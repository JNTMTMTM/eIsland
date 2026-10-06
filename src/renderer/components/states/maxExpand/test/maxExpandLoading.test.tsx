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
 * @file maxExpandLoading.test.tsx
 * @description maxExpandLoading 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import Component from '../maxExpandLoading';
import islandPageLoading from '../../../components/islandPageLoading';
import { render, value } from './componentHarness';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => options ? `${key}:${JSON.stringify(options)}` : key }) }));

describe('maxExpandLoading', () => {
  it('omits loading feedback outside performance mode and chooses launcher or app text', () => {
    expect(render(Component, { activeTab: 'todo', performanceModeEnabled: false })).toBeNull();
    const tree = render(Component, { activeTab: 'todo', performanceModeEnabled: true });
    expect(value(tree, islandPageLoading, 'title')).toContain('maxExpand.nav.todo');
    expect(value(tree, islandPageLoading, 'description')).toBe('maxExpand.loadingDescriptions.todo');
    const launcher = render(Component, { activeTab: 'todo', performanceModeEnabled: true, launcherVisible: true });
    expect(value(launcher, islandPageLoading, 'title')).toContain('maxExpand.appMode.title');
    expect(value(launcher, islandPageLoading, 'description')).toBe('maxExpand.appMode.hint');
  });
});
