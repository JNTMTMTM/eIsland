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
 * @file cliStatusSubscription.ts
 * @description 合并 CLI 增量并在订阅中断或版本缺口后重新获取完整摘要。
 * @author 鸡哥
 */

import { desktop } from './runtime';
import type { ClaudeCodeStatusSnapshot } from './types/claudeCode';
type Delta = ClaudeCodeStatusSnapshot & { kind: 'cli-delta'; baseRevision: number; revision: number; sessionIds: string[]; eventIds: string[] };

/** 每个订阅只保留一份摘要；取消订阅后拒绝异步补帧结果。
 * @param channel - CLI 变化事件名称。
 * @param getChannel - 从 Rust 读取完整摘要的操作。
 * @param callback - 接收合并后摘要的回调。
 * @returns 可重复调用的取消订阅函数。
 */
export default function subscribeCliStatus(channel: string, getChannel: string, callback: (snapshot: ClaudeCodeStatusSnapshot) => void): () => void {
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
      const reload = async (): Promise<void> => {
        try {
          const snapshot = await desktop.invoke<ClaudeCodeStatusSnapshot>(getChannel);
          if (closed) return;
          current = snapshot; callback(snapshot);
        } finally {
          loading = false;
          const waiting = latest; latest = null;
          if (waiting && current && waiting.revision > (current.revision ?? 0)) accept(waiting);
        }
      };
      // eslint-disable-next-line promise/prefer-await-to-then -- 事件订阅同步返回，补帧在后台执行。
      reload().catch(console.error);
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
  const handler = (data: Delta): void => {
    if (data?.kind === 'cli-delta') accept(data);
    else { current = data; callback(data); }
  };
  desktop.on(channel, handler);
  return () => { closed = true; current = null; latest = null; desktop.off(channel, handler); };
}
