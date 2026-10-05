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
 * @file localFileSearchRootRow.test.tsx
 * @description LocalFileSearchRootRow 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { LocalFileSearchRootRow as Component } from '../LocalFileSearchRootRow';

describe('LocalFileSearchRootRow', () => {
  it('forwards edited directory and chooser activation', () => {
    const props = { rootDir: 'C:/files', setRootDir: vi.fn(), onPickRootDir: vi.fn() };
    const tree = render(Component, props);
    expect(value(tree, 'input', 'value')).toBe('C:/files');
    trigger(tree, 'input', 'onChange', { target: { value: 'D:/docs' } });
    trigger(tree, 'button', 'onClick');
    expect(props.setRootDir).toHaveBeenCalledWith('D:/docs');
    expect(props.onPickRootDir).toHaveBeenCalledOnce();
  });
});
