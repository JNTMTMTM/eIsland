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
 * @file formulaExpression.test.tsx
 * @description FormulaExpression 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { FormulaExpression as Component } from '../FormulaExpression';

describe('FormulaExpression', () => {
  it('renders actual KaTeX and ignores clicks without a measured matching anchor', () => {
    const onCursorChange = vi.fn();
    const tree = render(Component, {
      onCursorChange,
      document: {
        segments: [{
          type: 'text',
          value: '12'
        }]
      },
      cursor: {
        path: [],
        segmentIndex: 0,
        offset: 0
      }
    });
    expect(value(tree, '.calc-katex-render', 'dangerouslySetInnerHTML')).toEqual({ __html: expect.stringContaining('katex') as unknown });
    expect(nodes(tree, '.calc-katex-cursor')).toHaveLength(0);
    trigger(tree, '.calc-katex-expression', 'onClick', { target: { closest: () => null } });
    expect(onCursorChange).not.toHaveBeenCalled();
  });
});
