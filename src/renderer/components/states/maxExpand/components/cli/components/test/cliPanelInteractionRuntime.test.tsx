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
 * @file cliPanelInteractionRuntime.test.tsx
 * @description CLI 真实组件及格式化工具的分页、授权、详情与热力图指标交互测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { formatTime, phaseLabel, permissionProjectLabel, matchesFilter } from '../../utils/cliFormatters';
import type { ReactNode, RefObject } from 'react';
import type { ClaudeCodeHookEvent, ClaudeCodeSessionSnapshot, ClaudeCodeStatusSnapshot } from '../../../../../../../../preload/types';
let row: typeof import('../EventRow').EventRow;
let stream: typeof import('../EventStreamPanel').EventStreamPanel;
let sidebar: typeof import('../SessionSidebar').SessionSidebar;
let heatmap: typeof import('../ActivityHeatmap').ActivityHeatmap;
const animation = vi.fn();
const permission = vi.fn<(sessionId: string, decision: 'allow' | 'deny' | 'always') => Promise<boolean>>();
const t = vi.fn<(key: string, options?: Record<string, unknown>) => string>((key) => key);
/** 创建真实 IPC 事件数据。
 * @param patch - 事件覆盖
 * @returns CLI 事件
 */
function event(patch: Partial<ClaudeCodeHookEvent> = {}): ClaudeCodeHookEvent {
  return {
    id: 'event',
    sessionId: 'session',
    eventName: 'PermissionRequest',
    kind: 'permission',
    cwd: null,
    transcriptPath: null,
    summary: 'summary',
    detail: null,
    detailItems: [],
    toolName: null,
    toolInputPreview: null,
    createdAt: 1,
    raw: {},
    ...patch
  };
}
/** 创建正常 IPC 会话快照。
 * @param patch - 会话覆盖
 * @returns CLI 会话
 */
function session(patch: Partial<ClaudeCodeSessionSnapshot> = {}): ClaudeCodeSessionSnapshot {
  return {
    id: 'session',
    title: 'title',
    phase: 'waiting_permission',
    cwd: null,
    transcriptPath: null,
    lastSummary: 'summary',
    lastEventAt: 1,
    pendingPermission: event(),
    events: [],
    ...patch
  };
}
/** 创建正常 IPC 状态快照。
 * @param enabled - 是否监听
 * @returns CLI 快照
 */
function snapshot(enabled: boolean): ClaudeCodeStatusSnapshot {
  return {
    enabled,
    receiverRunning: false,
    receiverUrl: null,
    settingsPath: '',
    hookScriptPath: '',
    sessions: [],
    events: [event()],
    heatmap: {},
    updatedAt: 1
  };
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.clearAllMocks();
  permission.mockResolvedValue(true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    api: {
      claudeCodePermissionResolve: permission
    }
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  vi.doMock('gsap', () => ({
    gsap: {
      fromTo: animation
    }
  }));
  vi.doMock('@gsap/react', async () => {
    const {
      useEffect
    } = await import('react');
    return {
      useGSAP: (callback: () => void) => useEffect(() => callback(), [callback])
    };
  });
  ({
    EventRow: row
  } = await import('../EventRow'));
  ({
    EventStreamPanel: stream
  } = await import('../EventStreamPanel'));
  ({
    SessionSidebar: sidebar
  } = await import('../SessionSidebar'));
  ({
    ActivityHeatmap: heatmap
  } = await import('../ActivityHeatmap'));
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('CLI actual public interactions', () => {
  it('event native animation executes after a public ref attaches and detail preview stops bubbling', () => {
    const props = {
      t,
      event: event({
        toolName: 'Bash',
        toolInputPreview: 'echo command',
        detailItems: [{
          label: 'command',
          value: 'echo command'
        }, {
          label: 'empty',
          value: ''
        }]
      }),
      showPermission: true
    };
    const tree = renderHook(row, props);
    const card = {
      nodeType: 1
    };
    (byClass(tree, 'cli-event-card').props.ref as RefObject<unknown>).current = card;
    flushHookEffects();
    expect(animation).toHaveBeenCalledWith(card, expect.any(Object), expect.any(Object));
    const stopPropagation = vi.fn();
    invoke(find(tree, (n) => n.type === 'code'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    ['deny', 'allow', 'always'].forEach((decision) => invoke(byClass(tree, `cli-event-card-permission-${  decision}`), 'onClick'));
    expect(permission.mock.calls).toEqual([['session', 'deny'], ['session', 'allow'], ['session', 'always']]);
    invoke(byClass(tree, 'cli-event-card-details-toggle'), 'onClick');
    flushHookEffects();
    expect(text(renderHook(row, props))).toContain('maxExpand.cli.collapse');
    invoke(byClass(renderHook(row, props), 'cli-event-card-details-toggle'), 'onClick');
    renderHook(row, props);
    flushHookEffects();
    vi.advanceTimersByTime(260);
    expect(elements(renderHook(row, props)).some((n) => n.props.className === 'cli-event-card-detail-item')).toBe(false);
  });
  it('unattached event animation is skipped and null details have no expandable content', () => {
    const tree = renderHook(row, {
      t,
      event: event(),
      showPermission: false
    });
    flushHookEffects();
    expect(animation).not.toHaveBeenCalled();
    expect(elements(tree).some((n) => n.props.className === 'cli-event-card-details')).toBe(false);
  });
  it.each(['claude', 'codex'] as const)('stream %s pagination, monitor, filters and enter handlers use real props', (provider) => {
    const setPage = vi.fn();
    const setCli = vi.fn();
    const setEventFilter = vi.fn();
    const enableMonitor = vi.fn<() => Promise<void>>().mockResolvedValue();
    const disableMonitor = vi.fn<() => Promise<void>>().mockResolvedValue();
    const clearEvents = vi.fn<() => Promise<void>>().mockResolvedValue();
    const props = {
      t,
      provider,
      setEventFilter,
      setPage,
      enableMonitor,
      disableMonitor,
      clearEvents,
      setCli,
      onProviderChange: vi.fn(),
      snapshot: snapshot(true),
      eventFilter: 'all' as const,
      selectedSessionTitle: undefined,
      filteredEvents: [event()],
      pagedEvents: [event()],
      pendingPermissionEventIds: new Set(['event']),
      totalPages: 3,
      currentPage: 1,
      activeSessionCount: 1
    };
    const tree = renderHook(stream, props);
    const disabled = renderHook(stream, {...props, snapshot:snapshot(false)});
    invoke(find(disabled, (n)=>n.props.title === (provider === 'claude' ? 'maxExpand.cli.enableHook' : 'maxExpand.cli.enableMonitor')), 'onClick');
    expect(enableMonitor).toHaveBeenCalledOnce();
    const pages = elements(tree).filter((n) => n.props.className === 'cli-tab-page-btn');
    invoke(pages[0], 'onClick');
    invoke(pages[1], 'onClick');
    expect(setPage.mock.calls).toEqual([[0], [2]]);
    invoke(find(tree, (n) => n.props.title === 'maxExpand.cli.enterCliState'), 'onClick');
    expect(setCli).toHaveBeenCalledOnce();
    invoke(find(tree, (n) => n.props.title === 'maxExpand.cli.clear'), 'onClick');
    expect(clearEvents).toHaveBeenCalledOnce();
    invoke(find(tree, (n) => n.props.title === (provider === 'claude' ? 'maxExpand.cli.disableHook' : 'maxExpand.cli.disableMonitor')), 'onClick');
    expect(disableMonitor).toHaveBeenCalledOnce();
    invoke(byClass(tree, 'cli-tab-filter-btn'), 'onClick');
    expect(setEventFilter).toHaveBeenCalledWith('all');
    invoke(find(tree, (n) => n.type === 'button' && n.props.title === 'maxExpand.cli.heatmapAria'), 'onClick');
    expect(byClass(renderHook(stream, props), 'cli-tab-heatmap').props.className).toContain('open');
    invoke(find(renderHook(stream, props), (n) => n.type === 'button' && n.props.title === 'maxExpand.cli.heatmapAria'), 'onClick');
    expect(byClass(renderHook(stream, props), 'cli-tab-heatmap').props.className).not.toContain('open');
    invoke(find(renderHook(stream, props), (n) => n.type === 'button' && n.props.title === 'maxExpand.cli.filterAria'), 'onClick');
    expect(byClass(renderHook(stream, props), 'cli-tab-event-filters').props.className).toContain('open');
    invoke(find(renderHook(stream, props), (n) => n.type === 'button' && n.props.title === 'maxExpand.cli.filterAria'), 'onClick');
    expect(byClass(renderHook(stream, props), 'cli-tab-event-filters').props.className).not.toContain('open');
  });
  it.each([false, true])('sidebar selection mode %s handles session choice, all and pages', (bulkSelectMode) => {
    const setPage = vi.fn();
    const setSelectedSessionId = vi.fn();
    const handleToggleSessionSelection = vi.fn();
    const props = {
      t,
      setPage,
      setSelectedSessionId,
      bulkSelectMode,
      handleToggleSessionSelection,
      provider: 'claude' as const,
      sessions: [session()],
      totalSessionCount: 1,
      totalPages: 3,
      currentPage: 1,
      selectedSessionId: 'session',
      handleToggleBulkSelect: vi.fn(),
      selectedSessionIds: new Set(['session']),
      selectedSessionCount: 1,
      handleDeleteSelectedSessions: vi.fn()
    };
    const tree = renderHook(sidebar, props);
    invoke(byClass(tree, 'cli-tab-session-item'), 'onClick');
    if (bulkSelectMode) expect(handleToggleSessionSelection).toHaveBeenCalledWith('session');else expect(setSelectedSessionId).toHaveBeenCalledWith('session');
    invoke(byClass(tree, 'cli-tab-sidebar-count'), 'onClick');
    expect(setSelectedSessionId).toHaveBeenCalledWith(null);
    expect(byClass(renderHook(sidebar, {...props, selectedSessionId: null}), 'cli-tab-sidebar-count').props.className).toContain('active');
    const pages = elements(tree).filter((n) => n.props.className === 'cli-tab-page-btn');
    invoke(pages[0], 'onClick');
    invoke(pages[1], 'onClick');
    expect(setPage.mock.calls).toEqual([[0], [2]]);
    expect(text(tree)).toContain('maxExpand.cli.permissionProject');
  });
  it.each([false, true])('heatmap compact %s executes real nested component and all metric callbacks', (compact) => {
    const props = {
      compact,
      heatmap: {
        '2026-06-15': {
          session: 2,
          tool: 3,
          prompt: 4
        }
      }
    };
    const run = () => renderHook(() => {
      const node = heatmap(props);
      if (!isValidElement(node)) return node;
      const child = node;
      return (child.type as (value: unknown) => ReactNode)(child.props);
    });
    let tree = run();
    flushHookEffects();
    expect(elements(tree).filter((n) => String(n.props.className).split(' ').includes('cli-tab-heatmap-cell'))).toHaveLength(365);
    [0, 1, 2].forEach((index) => {
      const buttons = elements(tree).filter((n) => n.type === 'button');
      invoke(buttons[index], 'onClick');
      tree = run();
      expect(elements(tree).filter((n) => n.type === 'button')[index].props.className).toContain('active');
    });
  });
  it('formatter epochs, phases, authorization fallback and output filter are real public inputs', () => {
    expect(formatTime(0)).toBe('--');
    ['idle', 'running', 'completed', 'waiting_permission'].forEach((phase) => expect(phaseLabel(phase as ClaudeCodeSessionSnapshot['phase'], t)).toContain('maxExpand.cli.phase.'));
    [event({
      toolName: 'Bash'
    }), event({
      toolInputPreview: 'preview'
    }), event({
      summary: 'summary'
    })].forEach((item) => {
      permissionProjectLabel(item, t);
      expect(t).toHaveBeenLastCalledWith('maxExpand.cli.permissionProject', {
        defaultValue: '授权项目：{{project}}',
        project: item.toolName ?? item.toolInputPreview ?? item.summary
      });
    });
    expect(matchesFilter(event({
      detailItems: [{
        label: 'toolResult',
        value: 'done'
      }]
    }), 'output')).toBe(true);
    expect(matchesFilter(event({
      detailItems: [{
        label: 'assistantOutput',
        value: 'done'
      }]
    }), 'output')).toBe(true);
    expect(matchesFilter(event({
      detailItems: []
    }), 'output')).toBe(false);
    expect(matchesFilter(event(), 'tool')).toBe(false);
    expect(matchesFilter(event(), 'all')).toBe(true);
  });
});
