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
 * @file todoInputBarRuntime.test.tsx
 * @description 输入栏未选择事件大小按钮真实选择闭包测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { elements, invoke } from '../../../../../test/tree';
import { TodoInputBar } from '../TodoInputBar';
import type { TodoInputBarProps } from '../../types/todoTypes';
beforeEach(resetHook);
afterEach(unmountHook);
describe('TodoInputBar runtime', () => {
  it('each unselected size selects its exact value', () => {
    const setSize = vi.fn<TodoInputBarProps['setSize']>();
    const tree = renderHook(() => TodoInputBar({
      setSize,
      input: 'task',
      setInput: vi.fn(),
      priority: undefined,
      setPriority: vi.fn(),
      size: undefined,
      inputRef: {
        current: null
      },
      onAdd: vi.fn(),
      onKeyDown: vi.fn()
    }));
    elements(tree).filter((n) => n.type === 'button' && String(n.props.className).includes(' size')).forEach((n) => invoke(n, 'onClick'));
    expect(setSize.mock.calls.map((c) => c[0])).toEqual(['S', 'M', 'L', 'XL']);
  });
});
