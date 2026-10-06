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
 * @file localFileSearchConfigPanel.test.tsx
 * @description LocalFileSearchConfigPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import { LocalFileSearchConfigPanel as Component } from '../LocalFileSearchConfigPanel';

describe('LocalFileSearchConfigPanel', () => {
  const props = { resultLimit: 50, maxDepth: 2, matchScope: 'name', matchMode: 'contains', setResultLimit: vi.fn(), setMaxDepth: vi.fn(), setMatchScope: vi.fn(), setMatchMode: vi.fn(), setExtensionsInput: vi.fn(), setExcludeDirsInput: vi.fn(), setIncludeDirectories: vi.fn(), setIncludeFiles: vi.fn(), setIncludeHidden: vi.fn(), setCaseSensitive: vi.fn() };
  it('validates positive result limits, nonnegative depth and supported enum values', () => {
    const tree = render(Component, props);
    const change = (index: number, input: string): void => (value(tree, 'select', 'onChange', index) as (event: unknown) => void)({ target: { value: input } });
    ['0', '-1', 'NaN', 'Infinity'].forEach((input) => change(0, input));
    ['-1', 'NaN', 'Infinity'].forEach((input) => change(3, input));
    change(1, 'invalid'); change(2, 'invalid');
    expect(props.setResultLimit).not.toHaveBeenCalled();
    expect(props.setMaxDepth).not.toHaveBeenCalled();
    expect(props.setMatchScope).not.toHaveBeenCalled();
    expect(props.setMatchMode).not.toHaveBeenCalled();
    change(0, '120'); change(3, '0'); change(1, 'path'); change(2, 'exact');
    expect(props.setResultLimit).toHaveBeenCalledWith(120);
    expect(props.setMaxDepth).toHaveBeenCalledWith(0);
    expect(props.setMatchScope).toHaveBeenCalledWith('path');
    expect(props.setMatchMode).toHaveBeenCalledWith('exact');
  });
  it('forwards text lists and all four checkbox flags', () => {
    const tree = render(Component, props);
    nodes(tree, 'input').forEach((node, index) => (node.props.onChange as (event: unknown) => void)({ target: { value: index === 0 ? 'pdf,ts' : 'dist', checked: true } }));
    expect(props.setExtensionsInput).toHaveBeenCalledWith('pdf,ts');
    expect(props.setExcludeDirsInput).toHaveBeenCalledWith('dist');
    [props.setIncludeDirectories, props.setIncludeFiles, props.setIncludeHidden, props.setCaseSensitive].forEach((callback) => expect(callback).toHaveBeenCalledWith(true));
  });
});
