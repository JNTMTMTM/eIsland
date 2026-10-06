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
 * @file eventStreamPanel.test.tsx
 * @description EventStreamPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { EventStreamPanel as Component } from '../EventStreamPanel';
import { ActivityHeatmap } from '../ActivityHeatmap';
import { EventRow } from '../EventRow';
vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));
describe('EventStreamPanel', () => {
  const props = { t: (key: string) => key, provider: 'claude', snapshot: { enabled: false, events: [], heatmap: [] }, filteredEvents: [], pagedEvents: [], pendingPermissionEventIds: new Set(), totalPages: 1, currentPage: 0, activeSessionCount: 0, enableMonitor: vi.fn(), disableMonitor: vi.fn(), clearEvents: vi.fn(), setCli: vi.fn(), setPage: vi.fn() };
  it('renders empty events and disables stream and clear when unavailable', () => {
    const tree = render(Component, props);
    expect(text(tree)).toContain('maxExpand.cli.emptyEvents');
    expect(value(tree, '.cli-tab-action-btn', 'disabled', 1)).toBe(true);
    expect(value(tree, '.cli-tab-action-btn', 'disabled', 4)).toBe(true);
    trigger(tree, '.cli-tab-action-btn', 'onClick');
    expect(props.enableMonitor).toHaveBeenCalledOnce();
  });
  it('keeps filter and heatmap mutually exclusive and shows only Claude pending approvals', () => {
    const event = { id: 'e' };
    const populated = { ...props, snapshot: { ...props.snapshot, enabled: true }, filteredEvents: [event], pagedEvents: [event], pendingPermissionEventIds: new Set(['e']), totalPages: 2 };
    const tree = render(Component, populated);
    expect(value(tree, EventRow, 'showPermission')).toBe(true);
    (value(tree, '.cli-tab-action-btn', 'onClick', 2) as () => void)();
    expect(value(render(Component, populated), '.cli-tab-event-filters', 'className')).toContain('open');
    (value(tree, '.cli-tab-action-btn', 'onClick', 3) as () => void)();
    const heatmap = render(Component, populated);
    expect(value(heatmap, ActivityHeatmap, 'visible')).toBe(true);
    expect(value(heatmap, '.cli-tab-event-filters', 'className')).not.toContain('open');
    expect(value(render(Component, { ...populated, provider: 'codex' }), EventRow, 'showPermission')).toBe(false);
  });
});
