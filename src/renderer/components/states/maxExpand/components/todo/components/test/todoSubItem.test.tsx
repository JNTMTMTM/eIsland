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
 * @file todoSubItem.test.tsx
 * @description TodoSubItem 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { TodoSubItem as Component } from '../TodoSubItem';
import { TodoTitleInput } from '../TodoTitleInput';
describe('TodoSubItem', () => {
  const props = { sub: { id: 2, text: 'sub', done: false }, parentId: 1, onToggleSubDone: vi.fn(), onRemoveSubTodo: vi.fn(), onSaveSubTitle: vi.fn() };
  it('renders incomplete and completed tasks with optional tags', () => {
    const tree = render(Component, props);
    expect(value(tree, '.expand-todo-sub-check', 'aria-pressed')).toBe(false);
    expect(nodes(tree, '.expand-todo-priority-badge')).toHaveLength(0);
    const done = render(Component, { ...props, sub: { ...props.sub, done: true, priority: 'P0', size: 'S' } });
    expect(text(done)).toContain('✓P0S');
    expect(value(done, '.expand-todo-sub-check', 'aria-pressed')).toBe(true);
  });
  it('routes toggle, delete and title edits to the parent and child IDs', () => {
    const tree = render(Component, props);
    trigger(tree, '.expand-todo-sub-check', 'onClick');
    trigger(tree, '.expand-todo-sub-delete', 'onClick');
    trigger(tree, TodoTitleInput, 'onSave', 'renamed');
    expect(props.onToggleSubDone).toHaveBeenCalledWith(1, 2);
    expect(props.onRemoveSubTodo).toHaveBeenCalledWith(1, 2);
    expect(props.onSaveSubTitle).toHaveBeenCalledWith(1, 2, 'renamed');
  });
});
