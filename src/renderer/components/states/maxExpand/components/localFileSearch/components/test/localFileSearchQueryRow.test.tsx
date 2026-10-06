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
 * @file localFileSearchQueryRow.test.tsx
 * @description LocalFileSearchQueryRow 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { LocalFileSearchQueryRow as Component } from '../LocalFileSearchQueryRow';

describe('LocalFileSearchQueryRow', () => {
  it('searches with Enter or click and preserves functional configuration toggle', () => {
    const props = { keyword: '', setKeyword: vi.fn(), loading: false, showConfig: false, setShowConfig: vi.fn(), onSearch: vi.fn() };
    const tree = render(Component, props);
    trigger(tree, 'input', 'onChange', { target: { value: 'report' } });
    trigger(tree, 'input', 'onKeyDown', { key: 'Escape' });
    expect(props.onSearch).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onKeyDown', { key: 'Enter' });
    trigger(tree, '.local-file-search-btn', 'onClick');
    expect(props.onSearch).toHaveBeenCalledTimes(2);
    expect(props.setKeyword).toHaveBeenCalledWith('report');
    trigger(tree, '.local-file-search-config-toggle', 'onClick');
    const updater = props.setShowConfig.mock.calls[0][0] as (previous: boolean) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
    const loading = render(Component, { ...props, loading: true, showConfig: true });
    expect(text(loading)).toContain('maxExpand.localFileSearch.searching');
    expect(nodes(loading, '.active')).toHaveLength(1);
  });
});
