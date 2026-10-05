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
 * @file clipboardHistoryItemRow.test.tsx
 * @description ClipboardHistoryItemRow 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { ClipboardHistoryItemRow as Component } from '../ClipboardHistoryItemRow';

describe('ClipboardHistoryItemRow', () => {
  const item = { id: 1, text: 'content', createdAt: 1 };
  const props = { item, expanded: false, selectionMode: false, selected: false, selectionCollapsing: false, editText: '  ', onCopy: vi.fn(), onToggleExpand: vi.fn(), onToggleSelect: vi.fn(), onEditTextChange: vi.fn(), onEditTextareaRef: vi.fn(), onSaveEdit: vi.fn(), onRemove: vi.fn() };
  it('shows checkbox selection and expansion states and prevents saving blank edits', () => {
    const empty = render(Component, props);
    expect(nodes(empty, 'input')).toHaveLength(0);
    expect(value(empty, '.clipboard-history-save', 'disabled')).toBe(true);
    const tree = render(Component, { ...props, selectionMode: true, selected: true, expanded: true, editText: 'new' });
    expect(nodes(tree, '.clipboard-history-item--selected')).toHaveLength(1);
    expect(nodes(tree, '.clipboard-history-detail-wrapper--expanded')).toHaveLength(1);
    expect(value(tree, '.clipboard-history-save', 'disabled')).toBe(false);
    trigger(tree, 'input', 'onChange');
    trigger(tree, '.clipboard-history-copy', 'onClick');
    trigger(tree, '.clipboard-history-summary', 'onClick');
    trigger(tree, '.clipboard-history-remove', 'onClick');
    expect(props.onToggleSelect).toHaveBeenCalledWith(1);
    expect(props.onCopy).toHaveBeenCalledWith(item);
    expect(props.onToggleExpand).toHaveBeenCalledWith(item);
    expect(props.onRemove).toHaveBeenCalledWith(1);
  });
  it('updates editor reference and commits only Ctrl or Meta Enter', () => {
    const tree = render(Component, props);
    const target = {};
    trigger(tree, 'textarea', 'onChange', { target: { value: 'edited' }, currentTarget: target });
    expect(props.onEditTextChange).toHaveBeenCalledWith('edited');
    expect(props.onEditTextareaRef).toHaveBeenCalledWith(target);
    const event = { key: 'Enter', preventDefault: vi.fn() };
    trigger(tree, 'textarea', 'onKeyDown', event);
    expect(props.onSaveEdit).not.toHaveBeenCalled();
    trigger(tree, 'textarea', 'onKeyDown', { ...event, metaKey: true });
    expect(props.onSaveEdit).toHaveBeenCalledWith(1);
  });
});
