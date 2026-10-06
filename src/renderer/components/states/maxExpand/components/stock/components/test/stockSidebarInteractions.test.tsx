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
 * @file stockSidebarInteractions.test.tsx
 * @description 股票侧栏真实搜索、周期导航、键盘选择、批选删除和状态清理测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  byClass, elements, invoke, text
} from '../../../../../test/tree';
import {
  renderWithHooks, resetLifecycle, unmountHooks
} from '../../../setting/hooks/test/settingsCoverageHarness';
import {
  StockSidebar
} from '../StockSidebar';
import type {
  ComponentProps
} from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
let props: ComponentProps<typeof StockSidebar>;
/** 渲染实际股票侧栏保留公开状态。
 * @returns 实际元素树。
 */
function view() {
  return renderWithHooks(() => StockSidebar(props));
}
/** 查找实际收藏条目。
 * @returns 当前收藏元素。
 */
function items() {
  return elements(view()).filter((node) => String(node.props.className).startsWith('stock-favorite-item'));
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  props = {
    symbol: 'AAPL', favorites: [{
      source: 'test', addedAt: 1, code: 'AAPL', name: 'Apple', price: 10, changePercent: 1
    }, {
      source: 'test', addedAt: 1, code: 'MSFT', name: 'Microsoft', price: 20, changePercent: -1
    }], period: 'day', searching: false, searchResults: [], onPeriodChange: vi.fn(), onSelectSymbol: vi.fn(), onAddFavorite: vi.fn(), onRemoveFavorite: vi.fn(), onSearch: vi.fn().mockResolvedValue([]), onClearSearchResults: vi.fn(), onRefresh: vi.fn()
  };
});
afterEach(() => {
  unmountHooks();
});
describe('股票侧栏真实公开事件', () => {
  it('刷新、周期及展开开关保持实际导航接线', () => {
    invoke(elements(view()).find((node) => node.props['aria-label'] === 'stockTab.actions.refresh')!, 'onClick');
    expect(props.onRefresh).toHaveBeenCalledOnce();
    ['day', 'week', 'month'].forEach((period) => invoke(elements(view()).find((node) => node.props['aria-label'] === `stockTab.period.${period}`)!, 'onClick'));
    expect(props.onPeriodChange).toHaveBeenCalledTimes(3);
    invoke(byClass(view(), 'stock-sidebar-nav-toggle-btn'), 'onClick');
    expect(byClass(view(), 'stock-tab-sidebar').props.className).not.toContain('collapsed');
    invoke(byClass(view(), 'stock-sidebar-nav-toggle-btn'), 'onClick');
    expect(byClass(view(), 'stock-tab-sidebar').props.className).toContain('collapsed');
  });
  it('名称和代码搜索兼容空收藏且键盘只响应 Enter 和空格', () => {
    invoke(byClass(view(), 'stock-sidebar-nav-toggle-btn'), 'onClick');
    const preventDefault = vi.fn();
    invoke(items()[0], 'onKeyDown', {
      preventDefault, key: 'Escape'
    });
    expect(preventDefault).not.toHaveBeenCalled();
    invoke(items()[0], 'onKeyDown', {
      preventDefault, key: 'Enter'
    });
    invoke(items()[1], 'onKeyDown', {
      preventDefault, key: ' '
    });
    expect(props.onSelectSymbol).toHaveBeenNthCalledWith(2, 'MSFT');
    invoke(byClass(view(), 'stock-input'), 'onChange', {
      target: {
        value: ' aapl '
      }
    });
    expect(items()).toHaveLength(1);
    invoke(byClass(view(), 'stock-input'), 'onChange', {
      target: {
        value: 'micro'
      }
    });
    expect(items()).toHaveLength(1);
    props = {
      ...props, favorites: []
    };
    expect(text(view())).toContain('stockTab.sidebar.noFavorites');
  });
  it('批选取消、单个删除及退出删除模式清理选中并阻止冒泡', () => {
    invoke(byClass(view(), 'stock-sidebar-nav-delete-btn'), 'onClick');
    invoke(items()[0], 'onClick');
    invoke(items()[1], 'onClick');
    invoke(items()[0], 'onClick');
    expect(elements(view()).filter((node) => String(node.props.className).includes('stock-favorite-item') && String(node.props.className).includes('selected'))).toHaveLength(1);
    const stopPropagation = vi.fn();
    invoke(byClass(view(), 'stock-favorite-remove'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(props.onRemoveFavorite).toHaveBeenCalledWith('AAPL');
    invoke(byClass(view(), 'stock-favorites-delete-action'), 'onClick');
    expect(props.onRemoveFavorite).toHaveBeenCalledWith('MSFT');
    invoke(byClass(view(), 'stock-sidebar-nav-delete-btn'), 'onClick');
    expect(byClass(view(), 'stock-tab-sidebar').props.className).not.toContain('delete-mode');
    invoke(byClass(view(), 'stock-sidebar-nav-delete-btn'), 'onClick');
    invoke(items()[0], 'onClick');
    invoke(byClass(view(), 'stock-sidebar-nav-search-btn'), 'onClick');
    expect(byClass(view(), 'stock-tab-sidebar').props.className).toContain('search-mode');
    expect(byClass(view(), 'stock-tab-sidebar').props.className).not.toContain('delete-mode');
  });
});
