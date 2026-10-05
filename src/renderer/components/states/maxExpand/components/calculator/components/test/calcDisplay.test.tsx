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
 * @file calcDisplay.test.tsx
 * @description CalcDisplay 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { CalcDisplay as Component } from '../CalcDisplay';
import { FormulaExpression } from '../FormulaExpression';
describe('CalcDisplay', () => {
  const props = { document: { segments: [] }, cursor: { path: [], segmentIndex: 0, offset: 0 }, result: null, fontSize: '34px', hasResult: false, onCursorChange: vi.fn(), onMoveEnd: vi.fn(), onKeyDown: vi.fn() };
  it('renders expression and optional results with the corresponding typography', () => {
    const tree = render(Component, props);
    expect(value(tree, '.calc-expression', 'style')).toEqual({ fontSize: '34px' });
    expect(value(tree, FormulaExpression, 'document')).toBe(props.document);
    const result = render(Component, { ...props, result: '42', hasResult: true });
    expect(text(result)).toBe('42');
    expect(value(result, '.calc-expression', 'style')).toBeUndefined();
    expect(nodes(render(Component, { ...props, showValue: false }), '.calc-value')).toHaveLength(0);
  });
  it('moves to the formula end on capture and forwards keyboard events', () => {
    const tree = render(Component, props);
    trigger(tree, '.calc-display', 'onClickCapture');
    trigger(tree, '.calc-display', 'onKeyDown', { key: 'Enter' });
    expect(props.onMoveEnd).toHaveBeenCalledOnce();
    expect(props.onKeyDown).toHaveBeenCalledWith({ key: 'Enter' });
  });
});
