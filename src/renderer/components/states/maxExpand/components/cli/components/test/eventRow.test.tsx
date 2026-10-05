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
 * @file eventRow.test.tsx
 * @description EventRow 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { EventRow as Component } from '../EventRow';
vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));
vi.mock('../../hooks/useCollapsibleContent', () => ({ default: (visible: boolean) => visible }));
describe('EventRow', () => {
  afterEach(() => vi.unstubAllGlobals());
  const event = { id: 'e', sessionId: 's', eventName: 'Stop', createdAt: 1, summary: 'Summary', detailItems: [] };
  it('omits missing extras and expands only nonempty details', () => {
    const tree = render(Component, { event, t: (key: string) => key, showPermission: false });
    expect(nodes(tree, '.cli-event-card--stop')).toHaveLength(1);
    expect(nodes(tree, '.cli-event-card-details')).toHaveLength(0);
    const props = { event: { ...event, toolName: 'Bash', detailItems: [{ label: 'command', value: 'echo hello' }, { label: 'blank', value: '' }] }, t: (key: string) => key, showPermission: false };
    const extra = render(Component, props);
    expect(nodes(extra, '.cli-event-card-detail-item')).toHaveLength(0);
    trigger(extra, '.cli-event-card-details-toggle', 'onClick');
    const opened = render(Component, props);
    expect(nodes(opened, '.cli-event-card-detail-item')).toHaveLength(1);
    expect(text(opened)).toContain('echo hello');
  });
  it('sends deny, allow and always decisions with the correct session ID', () => {
    const claudeCodePermissionResolve = vi.fn();
    vi.stubGlobal('window', { api: { claudeCodePermissionResolve } });
    const tree = render(Component, { event, t: (key: string) => key, showPermission: true });
    ['deny', 'allow', 'always'].forEach((decision) => trigger(tree, `.cli-event-card-permission-${  decision}`, 'onClick'));
    expect(claudeCodePermissionResolve.mock.calls).toEqual([['s', 'deny'], ['s', 'allow'], ['s', 'always']]);
  });
});
