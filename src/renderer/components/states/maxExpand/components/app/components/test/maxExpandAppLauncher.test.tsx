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
 * @file maxExpandAppLauncher.test.tsx
 * @description MaxExpandAppLauncher 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import Component from '../MaxExpandAppLauncher';
const layout = vi.hoisted(() => ({ tabs: ['todo', 'calendar'], ready: true, saving: false, saveFailed: false }));
const drag = vi.hoisted(() => ({ consumeClick: vi.fn(() => false), pressedTab: null as string | null, drag: null as { tab: string; x: number; y: number; offsets: unknown[]; hideTarget: boolean } | null }));
vi.mock('../../hooks/useAppLauncherLayout', () => ({ default: () => layout }));
vi.mock('../../hooks/useAppLauncherDrag', () => ({ default: () => drag }));
describe('MaxExpandAppLauncher', () => {
  const props = { onSelectApp: vi.fn() };
  it('selects a real app and suppresses a click consumed by a prior drag', () => {
    const tree = render(Component, props);
    expect(nodes(tree, '.max-expand-app-launcher-item')).toHaveLength(2);
    const event = { detail: 1, currentTarget: { dataset: { app: 'todo' } }, preventDefault: vi.fn() };
    trigger(tree, '.max-expand-app-launcher-item', 'onClick', event);
    expect(props.onSelectApp).toHaveBeenCalledWith('todo');
    drag.consumeClick.mockReturnValueOnce(true);
    trigger(tree, '.max-expand-app-launcher-item', 'onClick', event);
    expect(props.onSelectApp).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it('ignores touch hover and marks mouse hover while showing drag and save states', () => {
    const tree = render(Component, props);
    const currentTarget = { dataset: { app: 'todo' } };
    trigger(tree, '.max-expand-app-launcher-item', 'onPointerEnter', {
      currentTarget,
      pointerType: 'touch'
    });
    expect(nodes(render(Component, props), '.is-active')).toHaveLength(0);
    trigger(tree, '.max-expand-app-launcher-item', 'onPointerEnter', {
      currentTarget,
      pointerType: 'mouse'
    });
    expect(nodes(render(Component, props), '.is-active')).toHaveLength(1);
    layout.saveFailed = true; layout.saving = true;
    drag.pressedTab = 'todo'; drag.drag = { tab: 'todo', x: 4, y: 5, offsets: [], hideTarget: true };
    const active = render(Component, props);
    expect(value(active, '.max-expand-app-launcher', 'data-dragging')).toBe(true);
    expect(value(active, '.max-expand-app-hide-zone', 'data-active')).toBe(true);
    expect(nodes(active, '.max-expand-app-hold-progress')).toHaveLength(1);
    expect(text(active)).toContain('maxExpand.appMode.saveLayoutFailed');
  });
});
