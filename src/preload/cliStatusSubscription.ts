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
/** @file cliStatusSubscription.ts
 * @description 合并 CLI 增量并在订阅中断或版本缺口后重新获取完整摘要。
 * @author 鸡哥
 */
import { ipcRenderer } from 'electron';
import type { ClaudeCodeStatusSnapshot } from './types/claudeCode';
type Delta = ClaudeCodeStatusSnapshot & { kind: 'cli-delta'; baseRevision: number; revision: number; sessionIds: string[]; eventIds: string[] };

/** 每个订阅只保留一份摘要；取消订阅后拒绝异步补帧结果。 */
export function subscribeCliStatus(channel: string, getChannel: string, callback: (snapshot: ClaudeCodeStatusSnapshot) => void): () => void {
  let current: ClaudeCodeStatusSnapshot | null = null;
  let loading = false;
  let closed = false;
  let latest: Delta | null = null;
  const accept = (data: Delta): void => {
    if (closed || (current?.revision !== undefined && data.revision <= current.revision)) return;
    if (!current || current.revision !== data.baseRevision) {
      latest = data;
      if (loading) return;
      loading = true;
      void ipcRenderer.invoke(getChannel).then((snapshot: ClaudeCodeStatusSnapshot) => {
        if (closed) return;
        current = snapshot; callback(snapshot);
      }).catch(() => {}).finally(() => {
        loading = false;
        const waiting = latest; latest = null;
        if (waiting && current && waiting.revision > (current.revision ?? 0)) accept(waiting);
      });
      return;
    }
    const sessions = new Map(current.sessions.map((session) => [session.id, session]));
    data.sessions.forEach((session) => sessions.set(session.id, session));
    const events = new Map(current.events.map((event) => [event.id, event]));
    data.sessions.forEach((session) => session.events.forEach((event) => events.set(event.id, event)));
    data.events.forEach((event) => events.set(event.id, event));
    current = { ...data, sessions: data.sessionIds.flatMap((id) => sessions.has(id) ? [sessions.get(id)!] : []),
      events: data.eventIds.flatMap((id) => events.has(id) ? [events.get(id)!] : []) };
    callback(current);
  };
  const handler = (_event: Electron.IpcRendererEvent, data: Delta): void => {
    if (data?.kind === 'cli-delta') accept(data);
    else { current = data; callback(data); }
  };
  ipcRenderer.on(channel, handler);
  return () => { closed = true; current = null; latest = null; ipcRenderer.removeListener(channel, handler); };
}
