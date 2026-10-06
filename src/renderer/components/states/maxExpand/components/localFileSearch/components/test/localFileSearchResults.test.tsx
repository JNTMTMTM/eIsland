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
 * @file localFileSearchResults.test.tsx
 * @description LocalFileSearchResults 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { LocalFileSearchResults as Component } from '../LocalFileSearchResults';

describe('LocalFileSearchResults', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('distinguishes loading and empty results', () => {
    expect(text(render(Component, { loading: true, results: [], iconMap: {} }))).toContain('maxExpand.localFileSearch.loading');
    expect(text(render(Component, { loading: false, results: [], iconMap: {} }))).toContain('maxExpand.localFileSearch.empty');
  });
  it('renders directory, decoded icon and file fallback and opens the selected path', () => {
    const openFile = vi.fn();
    vi.stubGlobal('window', { api: { openFile } });
    const results = [{ path: 'C:/folder', name: 'folder', isDirectory: true }, { path: 'C:/icon', name: 'icon', isDirectory: false }, { path: 'C:/file', name: 'file', isDirectory: false }];
    const tree = render(Component, {
      results,
      loading: false,
      iconMap: {
        'C:/icon': 'abc'
      }
    });
    expect(text(tree)).toContain('📁');
    expect(text(tree)).toContain('📄');
    expect(value(tree, 'img', 'src')).toBe('data:image/png;base64,abc');
    trigger(tree, 'button', 'onDoubleClick');
    expect(openFile).toHaveBeenCalledWith('C:/folder');
  });
});
