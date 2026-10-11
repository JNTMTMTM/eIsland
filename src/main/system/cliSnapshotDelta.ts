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
/** @file cliSnapshotDelta.ts
 * @description 按会话变更发送轻量 CLI 增量，保留单调版本供订阅者检测丢帧。
 * @author 鸡哥
 */
import type { ClaudeCodeStatusSnapshot } from '../types/system/ClaudeCodeStatusSnapshot';

/** 创建单个提供者的增量发布器；force 标记日志文件修改但事件 ID 未变的会话。 */
export function createCliSnapshotDelta() {
  let previous: ClaudeCodeStatusSnapshot | null = null;
  let revision = 0;
  return {
    revision: (): number => revision,
    next: (snapshot: ClaudeCodeStatusSnapshot, force = new Set<string>()) => {
      const oldSessions = new Map(previous?.sessions.map((session) => [session.id, session]));
      const changed = snapshot.sessions.filter((session) => {
        const old = oldSessions.get(session.id);
        return force.has(session.id) || !old || old.phase !== session.phase || old.title !== session.title
          || old.pendingPermission !== session.pendingPermission || old.events.length !== session.events.length
          || old.events.some((event, index) => event !== session.events[index]);
      });
      const dirty = new Set(changed.map((session) => session.id));
      const oldEvents = new Map(previous?.events.map((event) => [event.id, event]));
      const events = snapshot.events.filter((event) => dirty.has(event.sessionId) || oldEvents.get(event.id) !== event);
      const update = { ...snapshot, kind: 'cli-delta' as const, baseRevision: revision, revision: ++revision,
        sessions: changed, events, sessionIds: snapshot.sessions.map((session) => session.id), eventIds: snapshot.events.map((event) => event.id) };
      previous = snapshot;
      return update;
    },
  };
}
