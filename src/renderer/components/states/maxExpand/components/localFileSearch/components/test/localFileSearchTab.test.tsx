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
 * @file localFileSearchTab.test.tsx
 * @description LocalFileSearchTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import { LocalFileSearchTab as Component } from '../LocalFileSearchTab';
import { LocalFileSearchQueryRow } from '../LocalFileSearchQueryRow';
import { LocalFileSearchResults } from '../LocalFileSearchResults';
import { LocalFileSearchConfigPanel } from '../LocalFileSearchConfigPanel';
const state = vi.hoisted(() => ({ showConfig: false, loading: false, results: [], handleSearch: vi.fn() }));
vi.mock('../../hooks/useLocalFileSearch', () => ({ useLocalFileSearch: () => state }));
describe('LocalFileSearchTab', () => {
  it('retains configuration, indicates progress and wires search and results', () => {
    const tree = render(Component);
    expect(nodes(tree, '.open')).toHaveLength(0);
    expect(nodes(tree, '.local-file-search-progress')).toHaveLength(0);
    expect(value(tree, LocalFileSearchQueryRow, 'onSearch')).toBe(state.handleSearch);
    expect(value(tree, LocalFileSearchResults, 'results')).toBe(state.results);
    state.showConfig = true; state.loading = true;
    const loading = render(Component);
    expect(nodes(loading, '.open')).toHaveLength(1);
    expect(nodes(loading, '.local-file-search-progress')).toHaveLength(1);
    expect(nodes(loading, LocalFileSearchConfigPanel)).toHaveLength(1);
  });
});
