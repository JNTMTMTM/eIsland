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
 * @file useTodoListRuntime.test.ts
 * @description 任务列表真实进度、自动折叠和新增任务展开生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { useTodoList } from '../useTodoList';
import type { AgentTodoItem } from '../../types/todoTypes';
beforeEach(resetHook);
afterEach(unmountHook);
describe('useTodoList runtime', () => {
  it('empty and pending tasks have zero progress and allow manual collapse', () => {
    expect(renderHook(() => useTodoList([]))).toMatchObject({
      collapsed: false,
      progress: 0,
      completedCount: 0,
      allCompleted: false,
      hasStarted: false
    });
    flushHookEffects();
    const pending: AgentTodoItem[] = [{
      id: '1',
      content: 'work',
      status: 'pending'
    }];
    let result = renderHook(() => useTodoList(pending));
    flushHookEffects();
    result.toggle();
    result = renderHook(() => useTodoList(pending));
    expect(result.collapsed).toBe(true);
    result.toggle();
    expect(renderHook(() => useTodoList(pending)).collapsed).toBe(false);
  });
  it('completion auto-collapses and only a newly appended incomplete task auto-expands', () => {
    const tasks: AgentTodoItem[] = [{
      id: '1',
      content: 'work',
      status: 'in_progress'
    }];
    renderHook(() => useTodoList(tasks));
    flushHookEffects();
    const complete: AgentTodoItem[] = [{
      ...tasks[0],
      status: 'completed'
    }];
    renderHook(() => useTodoList(complete));
    flushHookEffects();
    expect(renderHook(() => useTodoList(complete))).toMatchObject({
      collapsed: true,
      allCompleted: true,
      progress: 100
    });
    const moreComplete: AgentTodoItem[] = [...complete, {
      id: '2',
      content: 'done',
      status: 'completed'
    }];
    renderHook(() => useTodoList(moreComplete));
    flushHookEffects();
    expect(renderHook(() => useTodoList(moreComplete)).collapsed).toBe(true);
    const more: AgentTodoItem[] = [...moreComplete, {
      id: '3',
      content: 'next',
      status: 'pending'
    }];
    renderHook(() => useTodoList(more));
    flushHookEffects();
    expect(renderHook(() => useTodoList(more))).toMatchObject({
      collapsed: false,
      completedCount: 2,
      hasStarted: true,
      progress: 67
    });
  });
});
