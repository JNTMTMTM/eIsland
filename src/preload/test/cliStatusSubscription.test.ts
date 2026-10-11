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
/** @file cliStatusSubscription.test.ts
 * @description 验证增量传输、缺帧补全以及取消订阅后的异步竞态。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCliSnapshotDelta } from '../../main/system/cliSnapshotDelta';
import type { ClaudeCodeStatusSnapshot, ClaudeCodeHookEvent } from '../types/claudeCode';
const io = vi.hoisted(() => ({ listener: null as null | ((event: unknown, data: unknown) => void), invoke: vi.fn(), remove: vi.fn() }));
vi.mock('electron', () => ({ ipcRenderer: { invoke: io.invoke, on: (_channel: string, listener: typeof io.listener) => { io.listener = listener; }, removeListener: io.remove } }));
import { subscribeCliStatus } from '../cliStatusSubscription';
/** 构造共享对象身份的会话摘要，确保增量只携带变更会话。 */
function fixture(): ClaudeCodeStatusSnapshot {
  const event: ClaudeCodeHookEvent = { id: 'e1', sessionId: 's1', eventName: 'Stop', kind: 'completed', cwd: null, transcriptPath: null,
    summary: 'one', detail: null, detailItems: [], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} };
  const second = { ...event, id: 'e2', sessionId: 's2' };
  return { enabled: true, receiverRunning: true, receiverUrl: null, settingsPath: '', hookScriptPath: '', heatmap: {}, updatedAt: 1,
    events: [event, second], sessions: [event, second].map((item) => ({ id: item.sessionId, title: item.sessionId, cwd: null, transcriptPath: null,
      phase: 'idle', lastSummary: item.summary, lastEventAt: 1, pendingPermission: null, events: [item] })) };
}
/** 刷新仅由微任务组成的补帧队列。 */
async function settle(): Promise<void> { for (let count = 0; count < 10; count += 1) await Promise.resolve(); }
beforeEach(() => { io.listener = null; vi.resetAllMocks(); });
describe('CLI delta subscription', () => {
  it('initially resyncs, then preserves unchanged sessions and handles removals without sending their bodies', async () => {
    const make = createCliSnapshotDelta(); const initial = fixture(); const first = make.next(initial);
    io.invoke.mockResolvedValue({ ...initial, revision: first.revision });
    const receive = vi.fn(); const unsubscribe = subscribeCliStatus('changed', 'get', receive);
    io.listener?.({}, first); await settle();
    const added = { ...initial.events[0], id: 'new', summary: 'new' };
    const next = { ...initial, events: [added, ...initial.events], sessions: [{ ...initial.sessions[0], events: [added, initial.events[0]] }, initial.sessions[1]] };
    const change = make.next(next);
    expect(change.sessions.map((session) => session.id)).toEqual(['s1']);
    expect(change.events.some((event) => event.id === 'e2')).toBe(false);
    io.listener?.({}, change);
    expect(receive.mock.lastCall?.[0].events.map((event: ClaudeCodeHookEvent) => event.id)).toEqual(['new', 'e1', 'e2']);
    expect(receive.mock.lastCall?.[0].sessions[1]).toBe(initial.sessions[1]);
    io.listener?.({}, make.next({ ...next, sessions: [], events: [] }));
    expect(receive.mock.lastCall?.[0].events).toEqual([]); expect(receive.mock.lastCall?.[0].sessions).toEqual([]);
    expect(io.invoke).toHaveBeenCalledOnce(); unsubscribe(); expect(io.remove).toHaveBeenCalledOnce();
  });
  it('recovers missing revisions and ignores duplicate or stale deltas', async () => {
    const make = createCliSnapshotDelta(); const data = fixture(); const first = make.next(data);
    io.invoke.mockResolvedValue({ ...data, revision: 1 }); const receive = vi.fn();
    subscribeCliStatus('changed', 'get', receive); io.listener?.({}, first); await settle();
    make.next(data); const third = make.next(data);
    io.invoke.mockResolvedValue({ ...data, revision: 3 }); io.listener?.({}, third); await settle();
    expect(io.invoke).toHaveBeenCalledTimes(2);
    io.listener?.({}, first); io.listener?.({}, third); expect(receive).toHaveBeenCalledTimes(2);
  });
  it('does not deliver a late baseline after unsubscribe', async () => {
    let finish!: (value: ClaudeCodeStatusSnapshot) => void;
    io.invoke.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const data = fixture(); const receive = vi.fn(); const unsubscribe = subscribeCliStatus('changed', 'get', receive);
    io.listener?.({}, createCliSnapshotDelta().next(data)); unsubscribe();
    finish({ ...data, revision: 1 }); await settle(); expect(receive).not.toHaveBeenCalled();
  });
});
