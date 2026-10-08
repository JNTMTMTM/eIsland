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
 * @file maxExpandAppControls.test.tsx
 * @description MaxExpandAppControls 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../../test/componentHarness';
import Component from '../..';
import { MAX_EXPAND_APPS } from '../../../../app/config/appLauncherConfig';
describe('MaxExpandAppControls', () => {
  it('uses the active app icon and stops bubbling for both return controls', () => {
    const props = { activeTab: 'todo', onBackToExpanded: vi.fn(), onBackToLauncher: vi.fn() };
    const tree = render(Component, props);
    expect(value(tree, 'img', 'src')).toBe(MAX_EXPAND_APPS.todo.icon);
    expect(value(tree, 'img', 'alt')).toBe('maxExpand.nav.todo');
    const event = { stopPropagation: vi.fn() };
    trigger(tree, '.max-expand-app-back-button', 'onClick', event);
    trigger(tree, '.max-expand-app-home-button', 'onClick', event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    expect(props.onBackToExpanded).toHaveBeenCalledOnce();
    expect(props.onBackToLauncher).toHaveBeenCalledOnce();
  });
});
