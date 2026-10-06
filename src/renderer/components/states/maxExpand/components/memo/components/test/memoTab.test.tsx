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
 * @file memoTab.test.tsx
 * @description MemoTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import { MemoTab as Component } from '../MemoTab';
import { MemoEditor } from '../MemoEditor';
import { MemoEditorEmpty } from '../MemoEditorEmpty';
import { MemoSidebar } from '../MemoSidebar';
const state = vi.hoisted(() => ({ selectedMemo: null as { id: number } | null, filteredMemos: [], handleDelete: vi.fn() }));
vi.mock('../../hooks/useMemoTab', () => ({ useMemoTab: () => state }));
describe('MemoTab', () => {
  it('shows an empty editor then wires the selected memo and mutations', () => {
    const tree = render(Component);
    expect(nodes(tree, MemoEditorEmpty)).toHaveLength(1);
    expect(value(tree, MemoSidebar, 'filteredMemos')).toBe(state.filteredMemos);
    state.selectedMemo = { id: 1 };
    const selected = render(Component);
    expect(nodes(selected, MemoEditorEmpty)).toHaveLength(0);
    expect(value(selected, MemoEditor, 'selectedMemo')).toBe(state.selectedMemo);
    expect(value(selected, MemoEditor, 'handleDelete')).toBe(state.handleDelete);
  });
});
