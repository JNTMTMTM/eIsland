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
 * @file agentUsageTab.test.tsx
 * @description Agent 用量留白页的实际渲染和翻译测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, text, value } from '../../../maxExpand/test/componentHarness';
import { AgentUsageTab } from '../AgentUsageTab';

describe('AgentUsageTab', () => {
  it('渲染展开页样式、翻译标签且内容留白', () => {
    const tree = render(AgentUsageTab);
    expect(value(tree, 'div', 'className')).toBe('expand-tab-panel');
    expect(value(tree, 'div', 'aria-label')).toBe('expanded.nav.agentUsage');
    expect(text(tree)).toBe('');
  });
});
