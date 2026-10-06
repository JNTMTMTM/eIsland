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
 * @file albumSelectionBar.test.tsx
 * @description AlbumSelectionBar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, text } from '../../../../test/componentHarness';
import { AlbumSelectionBar as Component } from '../AlbumSelectionBar';

describe('AlbumSelectionBar', () => {
  it('keeps closed controls outside tab order and disables empty selections', () => {
    const props = { selectMode: false, selectedCount: 0, filteredCount: 0, allVisibleSelected: false, onSelectAllVisible: vi.fn(), onClearSelection: vi.fn(), onRemoveSelected: vi.fn(), onToggleSelectMode: vi.fn() };
    const closed = render(Component, props);
    expect(value(closed, '.album-selection-bar', 'aria-hidden')).toBe(true);
    expect(nodes(closed, 'button').every((node) => node.props.tabIndex === -1)).toBe(true);
    expect(nodes(closed, 'button').slice(0, 3).every((node) => node.props.disabled)).toBe(true);
    const tree = render(Component, { ...props, selectMode: true, selectedCount: 2, filteredCount: 2, allVisibleSelected: true });
    expect(text(tree)).toContain('albumTab.actions.unselectAllVisible');
    nodes(tree, 'button').forEach((node) => (node.props.onClick as () => void)());
    [props.onSelectAllVisible, props.onClearSelection, props.onRemoveSelected, props.onToggleSelectMode].forEach((callback) => expect(callback).toHaveBeenCalledOnce());
  });
});
