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
 * @file countdownCardList.test.tsx
 * @description CountdownCardList 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { CountdownCardList as Component } from '../CountdownCardList';
import { CountdownCard } from '../CountdownCard';
describe('CountdownCardList', () => {
  const item = { id: 1, name: 'Release', date: '2026-10-10', type: 'event', color: '#f00', pinned: false, archived: false };
  const props = { items: [], now: new Date(2026, 9, 6), saving: false, onStartEdit: vi.fn(), onDelete: vi.fn(), onAction: vi.fn() };
  it('renders empty state and routes edit, pin, copy, archive and delete', () => {
    expect(text(render(Component, props))).toContain('countdown.manage.empty');
    const tree = render(Component, { ...props, items: [item] });
    trigger(tree, CountdownCard, 'onClick');
    const buttons = nodes(tree, 'button');
    buttons.forEach((button) => (button.props.onClick as () => void)());
    expect(props.onStartEdit).toHaveBeenCalledTimes(2);
    expect(props.onAction.mock.calls).toEqual([[item, 'pin'], [item, 'copy'], [item, 'archive']]);
    expect(props.onDelete).toHaveBeenCalledWith(item);
  });
  it('disables mutation while saving and exposes pinned archived labels', () => {
    const tree = render(Component, { ...props, saving: true, items: [{ ...item, pinned: true, archived: true }] });
    expect(nodes(tree, 'button').slice(1).every((node) => node.props.disabled)).toBe(true);
    expect(value(tree, 'button', 'aria-pressed', 1)).toBe(true);
    expect(value(tree, 'button', 'title', 3)).toBe('countdown.manage.restore');
  });
});
