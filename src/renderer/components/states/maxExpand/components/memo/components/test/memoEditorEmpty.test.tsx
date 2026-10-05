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
 * @file memoEditorEmpty.test.tsx
 * @description MemoEditorEmpty 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, value, text } from '../../../../test/componentHarness';
import { MemoEditorEmpty as Component } from '../MemoEditorEmpty';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
describe('MemoEditorEmpty', () => {
  it('shows the selection hint with a decorative memo icon', () => {
    const tree = render(Component);
    expect(text(tree)).toContain('maxExpand.memo.selectHint');
    expect(value(tree, 'img', 'alt')).toBe('');
    expect(value(tree, 'img', 'src')).toBe(SvgIcon.MEMO);
  });
});
