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
 * @file stockMetrics.test.tsx
 * @description StockMetrics 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, nodes, text } from '../../../../test/componentHarness';
import { StockMetrics as Component } from '../StockMetrics';

describe('StockMetrics', () => {
  it('renders six absent metrics as placeholders and real quote values', () => {
    const empty = render(Component, { quote: null });
    expect(nodes(empty, 'strong')).toHaveLength(6);
    expect(text(empty).match(/--/g)).toHaveLength(6);
    const quote = { previousClose: 10, high: 12, low: 9, volume: 100, amount: 200, source: 'provider' };
    const tree = render(Component, { quote });
    expect(text(tree)).toContain('10.00');
    expect(text(tree)).toContain('12.00');
    expect(text(tree)).toContain('provider');
  });
});
