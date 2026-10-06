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
 * @file stockSearchPanel.test.tsx
 * @description StockSearchPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { StockSearchPanel as Component } from '../StockSearchPanel';

describe('StockSearchPanel', () => {
  const item = { code: 'AAPL', name: 'Apple', source: 'provider', price: 10, changePercent: 1 };
  const props = { searching: false, searchResults: [], favorites: [], onSelectSymbol: vi.fn(), onAddFavorite: vi.fn(), onRemoveFavorite: vi.fn(), onSearch: vi.fn(), onClearSearchResults: vi.fn() };
  it('tracks search input, submits it and clears input and results', () => {
    const tree = render(Component, props);
    trigger(tree, 'input', 'onChange', { target: { value: 'Apple' } });
    const changed = render(Component, props);
    trigger(changed, 'form', 'onSubmit', { preventDefault: vi.fn() });
    expect(props.onSearch).toHaveBeenCalledWith('Apple');
    (value(changed, '.stock-search-btn', 'onClick', 1) as () => void)();
    expect(props.onClearSearchResults).toHaveBeenCalledOnce();
    expect(value(render(Component, props), 'input', 'value')).toBe('');
  });
  it('caps results at eight and routes keyboard activation and independent favorite toggles', () => {
    const tree = render(Component, { ...props, searchResults: Array.from({ length: 10 }, (...[, index]) => ({ ...item, code: String(index) })) });
    expect(nodes(tree, '.stock-search-result-item')).toHaveLength(8);
    const event = { key: 'Enter', target: {}, currentTarget: {}, preventDefault: vi.fn(), stopPropagation: vi.fn() };
    trigger(tree, '.stock-search-result-item', 'onKeyDown', event);
    expect(props.onSelectSymbol).not.toHaveBeenCalled();
    trigger(tree, '.stock-search-result-item', 'onKeyDown', { ...event, target: event.currentTarget });
    expect(props.onSelectSymbol).toHaveBeenCalledWith('0');
    const result = render(Component, { ...props, searchResults: [item] });
    trigger(result, '.stock-search-result-add', 'onClick', event);
    expect(props.onAddFavorite).toHaveBeenCalledWith(item);
    trigger(render(Component, { ...props, searchResults: [item], favorites: [item] }), '.stock-search-result-add', 'onClick', event);
    expect(props.onRemoveFavorite).toHaveBeenCalledWith('AAPL');
  });
  it('原生存储无关键词时回退空值，空格激活而其他键不触发选择', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    try {
      const tree = render(Component, { ...props, searchResults: [item] });
      expect(value(tree, 'input', 'value')).toBe('');
      props.onSelectSymbol.mockClear();
      const target = {};
      const event = { target, currentTarget: target, key: 'Escape', preventDefault: vi.fn() };
      trigger(tree, '.stock-search-result-item', 'onKeyDown', event);
      expect(props.onSelectSymbol).not.toHaveBeenCalled();
      trigger(tree, '.stock-search-result-item', 'onKeyDown', { ...event, key: ' ' });
      trigger(tree, '.stock-search-result-item', 'onClick');
      expect(props.onSelectSymbol.mock.calls).toEqual([['AAPL'], ['AAPL']]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

});
