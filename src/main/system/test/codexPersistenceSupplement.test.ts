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
 * @file codexPersistenceSupplement.test.ts
 * @description Codex 无会话目录、持久化字段恢复和重复关闭监视边界测试。
 * @author 鸡哥
 */

import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCodexStatusService } from '../codexStatusService';
import type { BrowserWindow } from 'electron';
interface Entry { name: string; isDirectory: () => boolean; isFile: () => boolean; }
const io = vi.hoisted(() => ({ files: new Map<string, string>(), entries: new Map<string, Entry[]>(), meta: new Map<string, { mtimeMs: number; size: number }>(), readLines: vi.fn<(file: string) => Iterable<string>>(), write: vi.fn<(file: string, text: string) => void>(), scan: vi.fn<(directory: string) => Entry[]>(), stat: vi.fn<(file: string) => { mtimeMs: number; size: number }>() }));
vi.mock('electron', () => ({ app: { getPath: (name: string) => name === 'home' ? 'C:/test-home' : 'C:/test-data' } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.files.has(file) || io.entries.has(file), mkdirSync: vi.fn(), readFileSync: (file: string) => io.files.get(file) ?? '', readdirSync: io.scan, statSync: io.stat, writeFileSync: io.write }));
vi.mock('../../utils/textFileLines', () => ({ readTextLinesSync: io.readLines }));
const root = join('C:/test-home', '.codex', 'sessions');
const persisted = join('C:/test-data', 'eIsland_store', 'codex-status-state.json');
const send = vi.fn();
const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow;
const now = Date.parse('2026-10-06T00:00:00Z');
/**
 * 添加虚拟 rollout，文件读取仅来自内存。
 * @param id - 会话标识
 * @param event - 最新事件类型
 * @param timestamp - 最新事件毫秒时间
 * @returns 内存文件路径
 */
function rollout(id = 'session', event = 'user_message', timestamp = now - 1000): string {
  const file = join(root, `${id  }.jsonl`);
  const content = [{ type: 'session_meta', timestamp: new Date(timestamp - 1000).toISOString(), payload: { id, cwd: 'C:/work/demo' } }, { type: 'event_msg', timestamp: new Date(timestamp).toISOString(), payload: { type: event, message: 'Prompt', last_agent_message: 'Done' } }].map((line) => JSON.stringify(line)).join('\n');
  io.files.set(file, content); io.meta.set(file, { mtimeMs: timestamp, size: content.length });
  io.entries.set(root, [...(io.entries.get(root) ?? []).filter((entry) => entry.name !== `${id  }.jsonl`), { name: `${id  }.jsonl`, isDirectory: () => false, isFile: () => true }]);
  return file;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); io.files.clear(); io.entries.clear(); io.meta.clear();
  io.write.mockReset(); io.write.mockImplementation((file, content) => { io.files.set(file, content); });
  io.scan.mockReset(); io.scan.mockImplementation((directory) => io.entries.get(directory) ?? []);
  io.stat.mockReset(); io.stat.mockImplementation((file) => { const meta = io.meta.get(file); if (!meta) throw new Error('rotated'); return meta; });
  io.readLines.mockReset(); io.readLines.mockImplementation((file) => (io.files.get(file) ?? '').split('\n'));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('Codex 持久化加载与监视器空目录边界', () => {
  it('首次安装没有 sessions 目录时返回空快照，重复关闭监视无定时器', async () => {
    const target = createCodexStatusService({ getMainWindow: () => window });
    await target.start(); expect(target.getSnapshot().sessions).toEqual([]);
    expect(target.getSnapshot().receiverRunning).toBe(true);
    await target.disableMonitor(); await target.disableMonitor();
    expect(vi.getTimerCount()).toBe(0); target.stop();
  });
  it('读取删除阈值及全局清空阈值，仅隐藏相应历史事件', async () => {
    rollout('older', 'user_message', now - 3000); rollout('deleted'); rollout('visible');
    io.files.set(persisted, JSON.stringify({ clearBefore: now - 2000, deletedBeforeBySession: { deleted: now } }));
    const target = createCodexStatusService({ getMainWindow: () => window });
    await target.start(); expect(target.getSnapshot().sessions.map((session) => session.id)).toEqual(['visible']);
    expect(Object.values(target.getSnapshot().heatmap)[0].prompt).toBe(3); target.stop();
  });
  it('删除阈值非对象时回退空映射', async () => {
    rollout('visible'); io.files.set(persisted, JSON.stringify({ deletedBeforeBySession: 'invalid' }));
    const target = createCodexStatusService({ getMainWindow: () => window });
    await target.start(); expect(target.getSnapshot().sessions.map((session) => session.id)).toEqual(['visible']); target.stop();
  });
});
