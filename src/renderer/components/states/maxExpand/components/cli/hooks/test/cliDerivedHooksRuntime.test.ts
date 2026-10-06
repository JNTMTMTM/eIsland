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
 * @file cliDerivedHooksRuntime.test.ts
 * @description 真实 CLI 批量选择、事件派生、分页、热力图及折叠生命周期测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkSelect } from '../useBulkSelect';
import { useCliEvents } from '../useCliEvents';
import { useEventPagination } from '../useEventPagination';
import { useSessionPagination } from '../useSessionPagination';
import { usePendingPermissions } from '../usePendingPermissions';
import { useHeatmapGrid } from '../useHeatmapGrid';
import { useHeatmapScroll } from '../useHeatmapScroll';
import useCollapsibleContent from '../useCollapsibleContent';
import { flushHookEffects, renderHook, resetHook, unmountHook, settleHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ClaudeCodeHookEvent, ClaudeCodeSessionSnapshot, ClaudeCodeStatusSnapshot } from '../../../../../../../../preload/types/claudeCode';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
/** 生成真实 IPC 协议事件。
 * @param id - 事件标识
 * @param patch - 网络载荷字段
 * @returns 完整事件
 */
function event(id: string, patch: Partial<ClaudeCodeHookEvent> = {}): ClaudeCodeHookEvent {
  return {
    id,
    eventName: 'UserPromptSubmit',
    kind: 'message',
    sessionId: 'a',
    cwd: null,
    transcriptPath: null,
    summary: 'prompt',
    detail: null,
    detailItems: [],
    toolName: null,
    toolInputPreview: null,
    createdAt: 1,
    raw: {},
    ...patch
  };
}
/** 生成真实会话协议。
 * @param id - 会话标识
 * @param patch - IPC载荷
 * @returns 完整会话
 */
function session(id: string, patch: Partial<ClaudeCodeSessionSnapshot> = {}): ClaudeCodeSessionSnapshot {
  return {
    id,
    title: id,
    phase: 'running',
    cwd: null,
    transcriptPath: null,
    lastSummary: '',
    lastEventAt: 1,
    pendingPermission: null,
    events: [],
    ...patch
  };
}
/** 生成真实状态协议。
 * @param patch - 状态覆盖
 * @returns 完整状态
 */
function snapshot(patch: Partial<ClaudeCodeStatusSnapshot> = {}): ClaudeCodeStatusSnapshot {
  return {
    enabled: true,
    receiverRunning: true,
    receiverUrl: null,
    settingsPath: '',
    hookScriptPath: '',
    sessions: [],
    events: [],
    heatmap: {},
    updatedAt: 1,
    ...patch
  };
}
const remove = vi.fn<(ids: string[]) => Promise<void>>();
const single = vi.fn<(id: string | null) => void>();
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 15, 12));
  remove.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('CLI real derived hooks and effects', () => {
  it('bulk toggle adds/removes selected IDs, cleans disappeared sessions and leaves unchanged set identity', () => {
    const list = [session('a'), session('b')];
    const run = () => renderHook(useBulkSelect, list, remove, 'a', single);
    run();
    flushHookEffects();
    run().handleDeleteSelectedSessions();
    expect(remove).not.toHaveBeenCalled();
    run().handleToggleBulkSelect();
    run().handleToggleSessionSelection('a');
    run().handleToggleSessionSelection('b');
    run().handleToggleSessionSelection('b');
    expect(run().selectedSessionCount).toBe(1);
    const old = run().selectedSessionIds;
    renderHook(useBulkSelect, [...list], remove, 'a', single);
    flushHookEffects();
    expect(run().selectedSessionIds).toBe(old);
    renderHook(useBulkSelect, [session('b')], remove, 'a', single);
    flushHookEffects();
    expect(run().selectedSessionCount).toBe(0);
    run().handleToggleSessionSelection('b');
    run().handleToggleBulkSelect();
    expect(run()).toMatchObject({
      bulkSelectMode: false,
      selectedSessionCount: 0
    });
    run().handleToggleBulkSelect();
    renderHook(useBulkSelect, [], remove, null, single);
    flushHookEffects();
    expect(run().bulkSelectMode).toBe(false);
  });
  it.each(['a', 'b', null])('bulk deletion with current %s clears matching single selection only and consumes rejection', async (selected) => {
    remove.mockRejectedValue(new Error('delete'));
    const run = () => renderHook(useBulkSelect, [session('a')], remove, selected, single);
    run().handleToggleBulkSelect();
    run().handleToggleSessionSelection('a');
    run().handleDeleteSelectedSessions();
    await settleHook();
    expect(remove).toHaveBeenCalledWith(['a']);
    expect(single).toHaveBeenCalledTimes(selected === 'a' ? 1 : 0);
    expect(run()).toMatchObject({
      bulkSelectMode: false,
      selectedSessionCount: 0
    });
  });
  it('event and active session derivation follows real filters and clears removed public selection', () => {
    const a = session('a');
    const b = session('b', {
      phase: 'completed'
    });
    let input = snapshot({
      sessions: [a, b],
      events: [event('msg'), event('tool', {
        kind: 'tool'
      }), event('other', {
        sessionId: 'b'
      }), event('out', {
        detailItems: [{
          label: 'assistantOutput',
          value: 'result'
        }]
      })]
    });
    const run = () => renderHook(useCliEvents, input);
    expect(run().activeSessions).toEqual([a]);
    expect(run().selectedSession).toBeNull();
    expect(run().filteredEvents).toHaveLength(4);
    run().setSelectedSessionId('a');
    run();
    flushHookEffects();
    expect(run().selectedSession).toEqual(a);
    expect(run().filteredEvents).toHaveLength(3);
    run().setEventFilter('tool');
    expect(run().filteredEvents).toEqual([input.events[1]]);
    run().setEventFilter('output');
    expect(run().filteredEvents).toEqual([input.events[3]]);
    input = {
      ...input,
      sessions: [b]
    };
    run();
    flushHookEffects();
    expect(run().selectedSessionId).toBeNull();
  });
  it('event pagination resets on each public filter and session transition and clamps shrinking count', () => {
    const list = Array.from({
      length: 7
    }, (...[, i]) => event(String(i)));
    const run = () => renderHook(useEventPagination, list, 'all', 'a');
    run();
    flushHookEffects();
    run().setPage(2);
    expect(run()).toMatchObject({
      page: 2,
      currentPage: 2,
      totalPages: 3,
      pagedEvents: [list[6]]
    });
    renderHook(useEventPagination, list, 'tool', 'a');
    flushHookEffects();
    expect(renderHook(useEventPagination, list, 'tool', 'a').page).toBe(0);
    renderHook(useEventPagination, list, 'tool', 'a').setPage(1);
    renderHook(useEventPagination, list, 'tool', 'b');
    flushHookEffects();
    expect(renderHook(useEventPagination, list, 'tool', 'b').page).toBe(0);
    renderHook(useEventPagination, list, 'tool', 'b').setPage(9);
    expect(renderHook(useEventPagination, [], 'tool', 'b')).toMatchObject({
      currentPage: 0,
      totalPages: 1,
      pagedEvents: []
    });
  });
  it('session pagination resets provider and clamps oversized and negative public page input', () => {
    const list = Array.from({
      length: 8
    }, (...[, i]) => session(String(i)));
    renderHook(useSessionPagination, list, 'claude');
    flushHookEffects();
    renderHook(useSessionPagination, list, 'claude').setPage(1);
    expect(renderHook(useSessionPagination, list, 'claude').pagedSessions).toEqual(list.slice(6));
    renderHook(useSessionPagination, list, 'codex');
    flushHookEffects();
    expect(renderHook(useSessionPagination, list, 'codex').currentPage).toBe(0);
    renderHook(useSessionPagination, list, 'codex').setPage(-2);
    expect(renderHook(useSessionPagination, list, 'codex').currentPage).toBe(0);
  });
  it('waiting permissions include only waiting sessions with actual pending events', () => {
    const permission = event('permission', {
      kind: 'permission',
      eventName: 'PermissionRequest'
    });
    expect(renderHook(usePendingPermissions, [session('a', {
      phase: 'waiting_permission',
      pendingPermission: permission
    }), session('b', {
      phase: 'waiting_permission'
    }), session('c', {
      phase: 'completed',
      pendingPermission: permission
    })])).toEqual(new Set(['permission']));
  });
  it('heatmap uses real calendar grid, positive metric totals and color thresholds', () => {
    const heatmap = {
      '2026-1-10': {
        session: 5,
        tool: 2,
        prompt: 0
      },
      '2026-1-11': {
        session: 0,
        tool: 0,
        prompt: 1
      }
    };
    const grid = renderHook(useHeatmapGrid, heatmap, 'session');
    expect(grid).toMatchObject({
      max: 5,
      totals: {
        session: 5,
        tool: 2,
        prompt: 1
      }
    });
    expect(grid.months.flatMap((month) => month.cells).find((cell) => cell.key === '2026-1-10')?.count).toBe(5);
    expect([grid.levelOf(-1), grid.levelOf(0), grid.levelOf(1), grid.levelOf(5), grid.levelOf(50)]).toEqual([0, 0, 1, 4, 4]);
    expect(renderHook(useHeatmapGrid, heatmap, 'tool').max).toBe(2);
  });
  it.each(['hidden', 'missing-both', 'missing-today', 'ready'] as const)('heatmap scroll %s handles native ref and cleanup', async (kind) => {
    const visible = kind !== 'hidden';
    const refs = renderHook(useHeatmapScroll, visible, 'tool');
    const container = {
      scrollLeft: 0,
      clientWidth: 100
    };
    if (kind === 'ready' || kind === 'missing-today') refs.scrollRef.current = container as HTMLDivElement;
    if (kind === 'ready') {refs.todayRef.current = {
      offsetLeft: 200,
      offsetWidth: 20
    } as HTMLSpanElement;}
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(16);
    expect(container.scrollLeft).toBe(kind === 'ready' ? 160 : 0);
    renderHook(useHeatmapScroll, visible, 'session');
    flushHookEffects();
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('collapsible content retains through transition and cancels old cutoff when reopened', async () => {
    expect(renderHook(useCollapsibleContent, false, 100)).toBe(false);
    flushHookEffects();
    expect(renderHook(useCollapsibleContent, true, 100)).toBe(true);
    flushHookEffects();
    renderHook(useCollapsibleContent, false, 100);
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(50);
    renderHook(useCollapsibleContent, true, 100);
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(100);
    expect(renderHook(useCollapsibleContent, true, 100)).toBe(true);
    renderHook(useCollapsibleContent, false, 100);
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(100);
    expect(renderHook(useCollapsibleContent, false, 100)).toBe(false);
  });
});
