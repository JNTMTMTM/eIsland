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
 * @file cliTab.test.tsx
 * @description CliTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { CliTab as Component } from '../CliTab';
import { SessionSidebar } from '../SessionSidebar';
import { EventStreamPanel } from '../EventStreamPanel';
const store = vi.hoisted(() => ({ cliProvider: 'codex', setCliProvider: vi.fn(), setCli: vi.fn() }));
vi.mock('../../../../../../../store/isLandStore', () => ({ default: (selector: (state: typeof store) => unknown) => selector(store) }));
vi.mock('../../hooks/useCliStatus', () => ({ useCliStatus: () => ({ snapshot: { sessions: [{ id: 's' }] } }) }));
vi.mock('../../hooks/useCliEvents', () => ({ useCliEvents: () => ({ selectedSession: { title: 'Selected' }, activeSessions: [{}, {}], filteredEvents: [] }) }));
vi.mock('../../hooks/useBulkSelect', () => ({ useBulkSelect: () => ({}) }));
vi.mock('../../hooks/useEventPagination', () => ({ useEventPagination: () => ({ currentPage: 0, totalPages: 1, pagedEvents: [] }) }));
vi.mock('../../hooks/useSessionPagination', () => ({ useSessionPagination: () => ({ pagedSessions: [{ id: 's' }] }) }));
vi.mock('../../hooks/usePendingPermissions', () => ({ usePendingPermissions: () => new Set() }));
vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));
describe('CliTab', () => {
  it('wires selected-session, provider and pagination data to both panels', () => {
    const tree = render(Component);
    expect(value(tree, SessionSidebar, 'sessions')).toEqual([{ id: 's' }]);
    expect(value(tree, SessionSidebar, 'totalSessionCount')).toBe(1);
    expect(value(tree, EventStreamPanel, 'provider')).toBe('codex');
    expect(value(tree, EventStreamPanel, 'selectedSessionTitle')).toBe('Selected');
    expect(value(tree, EventStreamPanel, 'activeSessionCount')).toBe(2);
    expect(value(tree, EventStreamPanel, 'onProviderChange')).toBe(store.setCliProvider);
    const stopPropagation = vi.fn(); trigger(tree, '.cli-tab', 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
  });
});
