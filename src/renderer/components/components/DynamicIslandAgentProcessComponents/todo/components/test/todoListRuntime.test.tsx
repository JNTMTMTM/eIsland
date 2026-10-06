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
 * @file todoListRuntime.test.tsx
 * @description Agent 清单真实 Hook 完成、未开始和折叠交互渲染测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { elements, find, invoke, text } from '../../../../../states/test/tree';
import { TodoList } from '../TodoList';
import type { AgentTodoItem } from '../../types/todoTypes';
beforeEach(resetHook);
afterEach(unmountHook);
describe('Agent TodoList runtime', () => {
  it.each([undefined, 0, -1, 2])('turn %s badge and real collapse toggle', (turn) => {
    const items: AgentTodoItem[] = [{
      id: '1',
      content: 'pending',
      status: 'pending'
    }];
    const run = () => renderHook(() => TodoList({
      items,
      turn
    }));
    const tree = run();
    flushHookEffects();
    expect(text(tree).includes('#2')).toBe(turn === 2);
    expect(find(tree, (node) => node.type === 'button').props['aria-expanded']).toBe(true);
    invoke(find(tree, (node) => node.type === 'button'), 'onClick');
    expect(find(run(), (node) => node.type === 'button').props['aria-expanded']).toBe(false);
  });
  it('empty renders no section and mixed/all-completed statuses render actual icon nodes', () => {
    expect(elements(renderHook(() => TodoList({
      items: []
    }))).some((n) => n.type === 'section')).toBe(false);
    const items: AgentTodoItem[] = [{
      id: '1',
      content: 'done',
      status: 'completed'
    }, {
      id: '2',
      content: 'active',
      status: 'in_progress'
    }, {
      id: '3',
      content: 'pending',
      status: 'pending'
    }];
    const tree = renderHook(() => TodoList({
      items
    }));
    flushHookEffects();
    expect(elements(tree).filter((n) => n.type === 'li')).toHaveLength(3);
    expect(elements(tree).some((n) => n.props.style && (n.props.style as Record<string, string>)['--todo-progress'] === '33%')).toBe(true);
    const complete = items.map((item) => ({
      ...item,
      status: 'completed' as const
    }));
    renderHook(() => TodoList({
      items: complete
    }));
    flushHookEffects();
    expect(find(renderHook(() => TodoList({
      items: complete
    })), (n) => n.type === 'button').props['aria-expanded']).toBe(false);
  });
});
