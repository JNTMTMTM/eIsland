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
/** @file cliStateMigration.ts
 * @description 在短生命周期 Worker 内迁移旧 CLI 正文，成功后原子发布摘要索引。
 * @author 鸡哥
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, copyFileSync, statSync } from 'fs';
import type { ClaudeCodeHookEvent } from '../types/system/ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot } from '../types/system/ClaudeCodeSessionSnapshot';
import { cliDetailPath, summarizeCliEvent } from './cliEventDetails';
import { limitRecentSessions } from './sessionLimits';

/** 只由 Worker 调用；保留旧索引备份，全部详情写入成功前不覆盖旧文件。 */
export function migrateCliState(path: string, directory: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  // Worker 的 V8 上限不包含文件 Buffer；读取前再约束外部内存，失败时原件不动。
  if (statSync(path).size > 64 * 1024 * 1024) throw new Error('CLI history exceeds the 64 MiB migration budget');
  const root = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const sessions = limitRecentSessions(Array.isArray(root.sessions) ? root.sessions as ClaudeCodeSessionSnapshot[] : []);
  const events = (Array.isArray(root.events) ? root.events as ClaudeCodeHookEvent[] : []).slice(0, 120);
  if (root.version === 2) return { ...root, events, sessions };
  mkdirSync(directory, { recursive: true });
  const converted = new Map<string, ClaudeCodeHookEvent>();
  const convert = (event: ClaudeCodeHookEvent): ClaudeCodeHookEvent => {
    const existing = converted.get(event.id);
    if (existing) return existing;
    const detailPath = cliDetailPath(directory, event.id);
    writeFileSync(`${detailPath}.tmp`, JSON.stringify({ details: event.detailItems, raw: event.raw }, null, 2), 'utf8');
    renameSync(`${detailPath}.tmp`, detailPath);
    const summary = summarizeCliEvent({ ...event, detailProvider: 'claude' });
    converted.set(event.id, summary);
    return summary;
  };
  const next = { ...root, version: 2, events: events.map(convert), sessions: sessions.map((session) => ({
    ...session, events: (session.events ?? []).slice(0, 40).map(convert), pendingPermission: null,
  })) };
  if (!existsSync(`${path}.legacy.json`)) copyFileSync(path, `${path}.legacy.json`);
  writeFileSync(`${path}.tmp`, JSON.stringify(next), 'utf8');
  renameSync(`${path}.tmp`, path);
  return next;
}
