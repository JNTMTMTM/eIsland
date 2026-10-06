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
 * @file stockSidebar.test.tsx
 * @description StockSidebar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { StockSidebar as Component } from '../StockSidebar';
import { StockSearchPanel } from '../StockSearchPanel';
describe('StockSidebar', () => {
  const item = { code: 'AAPL', name: 'Apple', price: 10, changePercent: 1 };
  const props = { symbol: 'AAPL', favorites: [item], period: 'day', onSelectSymbol: vi.fn(), onRemoveFavorite: vi.fn() };
  it('opens search and favorites and distinguishes empty search matches', () => {
    const tree = render(Component, props);
    expect(nodes(tree, '.collapsed')).toHaveLength(1);
    trigger(tree, '.stock-sidebar-nav-search-btn', 'onClick');
    expect(nodes(render(Component, props), StockSearchPanel)).toHaveLength(1);
    trigger(tree, '.stock-sidebar-nav-btn', 'onClick');
    const favorites = render(Component, props);
    trigger(favorites, '.stock-favorite-item', 'onClick');
    expect(props.onSelectSymbol).toHaveBeenCalledWith('AAPL');
    trigger(favorites, 'input', 'onChange', { target: { value: 'missing' } });
    expect(text(render(Component, props))).toContain('stockTab.sidebar.noFavoriteMatches');
  });
  it('selects and removes favorites in deletion mode without opening the symbol', () => {
    const tree = render(Component, props);
    trigger(tree, '.stock-sidebar-nav-delete-btn', 'onClick');
    const deleting = render(Component, props);
    expect(value(deleting, '.stock-favorites-delete-action', 'disabled')).toBe(true);
    trigger(deleting, '.stock-favorite-item', 'onClick');
    const selected = render(Component, props);
    expect(value(selected, '.stock-favorites-delete-action', 'disabled')).toBe(false);
    trigger(selected, '.stock-favorites-delete-action', 'onClick');
    expect(props.onRemoveFavorite).toHaveBeenCalledWith('AAPL');
    expect(props.onSelectSymbol).not.toHaveBeenCalled();
  });
});
