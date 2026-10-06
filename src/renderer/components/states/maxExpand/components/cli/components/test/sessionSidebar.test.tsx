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
 * @file sessionSidebar.test.tsx
 * @description SessionSidebar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { SessionSidebar as Component } from '../SessionSidebar';

describe('SessionSidebar', () => {
  const session = { id: 'a', title: 'Session', phase: 'running', cwd: '/workspace' };
  const props = { t: (key: string) => key, provider: 'claude', sessions: [], selectedSessionIds: new Set(), bulkSelectMode: false, selectedSessionCount: 0, totalPages: 1, currentPage: 0, setSelectedSessionId: vi.fn(), handleToggleSessionSelection: vi.fn(), setPage: vi.fn() };
  it('renders empty state and normal or bulk selection and delete boundaries', () => {
    expect(text(render(Component, props))).toContain('maxExpand.cli.emptySessions');
    const tree = render(Component, { ...props, sessions: [session] });
    trigger(tree, '.cli-tab-session-item', 'onClick');
    expect(props.setSelectedSessionId).toHaveBeenCalledWith('a');
    expect(value(tree, '.cli-tab-bulk-delete', 'disabled')).toBe(true);
    const bulk = render(Component, { ...props, sessions: [session], provider: 'codex', bulkSelectMode: true, selectedSessionCount: 1, selectedSessionIds: new Set(['a']) });
    expect(nodes(bulk, '.cli-tab-session-icon--codex')).toHaveLength(1);
    expect(value(bulk, '.cli-tab-bulk-delete', 'disabled')).toBe(false);
    trigger(bulk, '.cli-tab-session-item', 'onClick');
    expect(props.handleToggleSessionSelection).toHaveBeenCalledWith('a');
    expect(props.setSelectedSessionId).toHaveBeenCalledTimes(1);
  });
  it('renders pagination only with multiple pages and disables first or last navigation', () => {
    expect(nodes(render(Component, props), '.cli-tab-session-pagination')).toHaveLength(0);
    const first = render(Component, { ...props, totalPages: 2 });
    expect(value(first, '.cli-tab-page-btn', 'disabled')).toBe(true);
    (value(first, '.cli-tab-page-btn', 'onClick', 1) as () => void)();
    expect(props.setPage).toHaveBeenCalledWith(1);
    const last = render(Component, { ...props, totalPages: 2, currentPage: 1 });
    expect(value(last, '.cli-tab-page-btn', 'disabled', 1)).toBe(true);
  });
});
