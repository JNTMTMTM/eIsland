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
 * @file clipboardHistoryBulkBar.test.tsx
 * @description ClipboardHistoryBulkBar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { ClipboardHistoryBulkBar as Component } from '../ClipboardHistoryBulkBar';

describe('ClipboardHistoryBulkBar', () => {
  it('disables actions for zero counts and routes active cleanup controls', () => {
    const props = { totalCount: 0, selectedCount: 0, cleanupMatchedCount: 0, cleanupRange: 'today', allSelected: false, onToggleSelectAll: vi.fn(), onRemoveSelected: vi.fn(), onCleanupRangeChange: vi.fn(), onClearByRange: vi.fn() };
    const empty = render(Component, props);
    expect(value(empty, 'input', 'disabled')).toBe(true);
    expect(value(empty, '.clipboard-history-bulk-delete', 'disabled')).toBe(true);
    expect(value(empty, '.clipboard-history-range-clear', 'disabled')).toBe(true);
    const tree = render(Component, { ...props, totalCount: 3, selectedCount: 2, cleanupMatchedCount: 1, allSelected: true, selectionCollapsing: true });
    expect(value(tree, 'input', 'checked')).toBe(true);
    expect(text(tree)).toContain('(2)');
    trigger(tree, 'input', 'onChange');
    trigger(tree, '.clipboard-history-bulk-delete', 'onClick');
    trigger(tree, 'select', 'onChange', { target: { value: 'last7Days' } });
    trigger(tree, '.clipboard-history-range-clear', 'onClick');
    expect(props.onToggleSelectAll).toHaveBeenCalledOnce();
    expect(props.onRemoveSelected).toHaveBeenCalledOnce();
    expect(props.onCleanupRangeChange).toHaveBeenCalledWith('last7Days');
    expect(props.onClearByRange).toHaveBeenCalledOnce();
  });
});
