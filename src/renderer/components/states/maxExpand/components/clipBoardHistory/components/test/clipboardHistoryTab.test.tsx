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
 * @file clipboardHistoryTab.test.tsx
 * @description ClipboardHistoryTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { ClipboardHistoryTab as Component } from '../ClipboardHistoryTab';
import { ClipboardHistoryBulkBar } from '../ClipboardHistoryBulkBar';
import { ClipboardHistoryHeader } from '../ClipboardHistoryHeader';
import { ClipboardHistoryItemRow } from '../ClipboardHistoryItemRow';
const items = vi.hoisted(() => ({ items: [] as { id: number; text: string; createdAt: number }[], setItems: vi.fn(), setExpandedId: vi.fn(), setEditText: vi.fn() }));
const selection = vi.hoisted(() => ({ visibleItems: [] as { id: number; text: string; createdAt: number }[], activeFilter: 'all', selectionMode: false, selectedIds: [] as number[], selectedIdSet: new Set<number>() }));
vi.mock('../../hooks/useClipboardHistoryItems', () => ({ useClipboardHistoryItems: () => items }));
vi.mock('../../hooks/useClipboardHistorySelection', () => ({ useClipboardHistorySelection: () => selection }));
vi.mock('../../hooks/useClipboardHistoryFeedback', () => ({ useClipboardHistoryFeedback: () => ({ copyFeedback: null, showCopyFeedback: vi.fn() }) }));
describe('ClipboardHistoryTab', () => {
  it('distinguishes empty, filtered-empty and selected items and clears all editor state', () => {
    expect(text(render(Component))).toContain('clipboardHistoryTab.empty:');
    const item = { id: 1, text: 'text', createdAt: 1 };
    items.items = [item];
    expect(text(render(Component))).toContain('clipboardHistoryTab.emptyFiltered:');
    selection.visibleItems = [item]; selection.selectionMode = true; selection.selectedIdSet = new Set([1]); selection.selectedIds = [1];
    const tree = render(Component);
    expect(nodes(tree, ClipboardHistoryBulkBar)).toHaveLength(1);
    expect(value(tree, ClipboardHistoryHeader, 'exportCount')).toBe(1);
    expect(value(tree, ClipboardHistoryItemRow, 'selected')).toBe(true);
    trigger(tree, ClipboardHistoryHeader, 'onClear');
    expect(items.setItems).toHaveBeenCalledWith([]);
    expect(items.setExpandedId).toHaveBeenCalledWith(null);
    expect(items.setEditText).toHaveBeenCalledWith('');
  });
});
