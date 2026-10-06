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
 * @file todoInputBar.test.tsx
 * @description TodoInputBar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { TodoInputBar as Component } from '../TodoInputBar';

describe('TodoInputBar', () => {
  const props = { input: '', setInput: vi.fn(), priority: 'P0', setPriority: vi.fn(), size: 'S', setSize: vi.fn(), inputRef: { current: null }, onAdd: vi.fn(), onKeyDown: vi.fn() };
  it('disables blank additions and forwards text and submit events', () => {
    expect(value(render(Component, props), '.expand-todo-add', 'disabled')).toBe(true);
    expect(value(render(Component, { ...props, input: '  ' }), '.expand-todo-add', 'disabled')).toBe(true);
    const tree = render(Component, { ...props, input: 'task' });
    expect(value(tree, '.expand-todo-add', 'disabled')).toBe(false);
    trigger(tree, 'input', 'onChange', { target: { value: 'new' } });
    trigger(tree, '.expand-todo-add', 'onClick');
    trigger(tree, 'input', 'onKeyDown', { key: 'Enter' });
    expect(props.setInput).toHaveBeenCalledWith('new');
    expect(props.onAdd).toHaveBeenCalledOnce();
    expect(props.onKeyDown).toHaveBeenCalledWith({ key: 'Enter' });
  });
  it('toggles selected priority and size off and selects unselected tags', () => {
    const tree = render(Component, props);
    trigger(tree, '.expand-todo-tag', 'onClick');
    expect(props.setPriority).toHaveBeenCalledWith(undefined);
    const tags = nodes(tree, '.expand-todo-tag');
    (tags[1].props.onClick as () => void)();
    expect(props.setPriority).toHaveBeenCalledWith('P1');
    const selectedSize = tags.find((node) => node.props['aria-pressed'] && String(node.props.className).includes('size'));
    expect(selectedSize).toBeDefined();
    (selectedSize!.props.onClick as () => void)();
    expect(props.setSize).toHaveBeenCalledWith(undefined);
  });
});
