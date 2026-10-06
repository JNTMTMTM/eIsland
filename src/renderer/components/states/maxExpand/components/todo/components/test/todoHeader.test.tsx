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
 * @file todoHeader.test.tsx
 * @description TodoHeader 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, nodes, text } from '../../../../test/componentHarness';
import { TodoHeader as Component } from '../TodoHeader';

describe('TodoHeader', () => {
  it('hides zero priority counters and shows independent nonzero counts', () => {
    const empty = render(Component, { doneCount: 0, undoneCount: 0, p0Count: 0, p1Count: 0, p2Count: 0 });
    expect(nodes(empty, '.p0')).toHaveLength(0);
    expect(nodes(empty, '.p1')).toHaveLength(0);
    expect(nodes(empty, '.p2')).toHaveLength(0);
    const full = render(Component, { doneCount: 2, undoneCount: 3, p0Count: 1, p1Count: 2, p2Count: 3 });
    expect(text(full)).toContain('P0 1P1 2P2 3');
    expect(text(full)).toContain('"count":2');
  });
});
