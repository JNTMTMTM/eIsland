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
 * @file clipboardHistoryHeader.test.tsx
 * @description ClipboardHistoryHeader 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { ClipboardHistoryHeader as Component } from '../ClipboardHistoryHeader';

describe('ClipboardHistoryHeader', () => {
  it('disables empty actions and uses selected export labels and active filters', () => {
    const props = { totalCount: 0, exportCount: 0, activeFilter: 'all', selectionMode: false, selectedCount: 0, countLabel: '0', onFilterChange: vi.fn(), onClear: vi.fn(), onExport: vi.fn(), onToggleSelectionMode: vi.fn() };
    const empty = render(Component, props);
    ['.clipboard-history-clear', '.clipboard-history-export', '.clipboard-history-select-toggle'].forEach((selector) => expect(value(empty, selector, 'disabled')).toBe(true));
    const tree = render(Component, { ...props, totalCount: 4, exportCount: 2, selectionMode: true, selectedCount: 2 });
    expect(value(tree, '.clipboard-history-export', 'title')).toContain('clipboardHistoryTab.actions.exportSelectedTitle');
    trigger(tree, '.clipboard-history-filter', 'onClick');
    trigger(tree, '.clipboard-history-clear', 'onClick');
    trigger(tree, '.clipboard-history-export', 'onClick');
    trigger(tree, '.clipboard-history-select-toggle', 'onClick');
    expect(props.onFilterChange).toHaveBeenCalledWith('all');
    [props.onClear, props.onExport, props.onToggleSelectionMode].forEach((callback) => expect(callback).toHaveBeenCalledOnce());
  });
});
