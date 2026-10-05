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
 * @file memoSidebar.test.tsx
 * @description MemoSidebar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { MemoSidebar as Component } from '../MemoSidebar';

describe('MemoSidebar', () => {
  const memo = { id: 1, title: '', content: '', tags: [], updatedAt: 1 };
  const props = { loaded: false, filteredMemos: [], selectedMemoIds: new Set(), memoTags: [], selectedMemoCount: 0, bulkSelectMode: false, setSelectedId: vi.fn(), handleToggleMemoSelection: vi.fn(), editorRef: { current: { focus: vi.fn() } } };
  afterEach(() => vi.useRealTimers());
  it('distinguishes loading and empty lists and disables inactive bulk deletion', () => {
    expect(nodes(render(Component, props), '.memo-tab-loading')).toHaveLength(1);
    const empty = render(Component, { ...props, loaded: true });
    expect(nodes(empty, '.memo-tab-empty')).toHaveLength(1);
    expect(value(empty, '.memo-tab-bulk-delete', 'disabled')).toBe(true);
    expect(value(empty, '.memo-tab-bulk-delete', 'tabIndex')).toBe(-1);
  });
  it('opens a memo with delayed editor focus or toggles selection in bulk mode', () => {
    vi.useFakeTimers();
    const tree = render(Component, { ...props, loaded: true, filteredMemos: [memo] });
    expect(text(tree)).toContain('maxExpand.memo.untitled');
    expect(text(tree)).toContain('maxExpand.memo.noContent');
    trigger(tree, '.memo-tab-item', 'onClick');
    expect(props.setSelectedId).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(50);
    expect(props.editorRef.current.focus).toHaveBeenCalledOnce();
    const selected = render(Component, { ...props, loaded: true, filteredMemos: [{ ...memo, pinned: true, bookmarked: true, tags: ['a', 'b', 'c', 'd'] }], bulkSelectMode: true, selectedMemoIds: new Set([1]), selectedMemoCount: 1 });
    expect(value(selected, '.memo-tab-bulk-delete', 'disabled')).toBe(false);
    expect(nodes(selected, '.memo-tab-item-tag')).toHaveLength(3);
    trigger(selected, '.memo-tab-item', 'onClick');
    expect(props.handleToggleMemoSelection).toHaveBeenCalledWith(1);
    expect(props.setSelectedId).toHaveBeenCalledTimes(1);
  });
});
