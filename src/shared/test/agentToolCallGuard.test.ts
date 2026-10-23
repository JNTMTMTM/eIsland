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
 * @file agentToolCallGuard.test.ts
 * @description 工具参数归一化、并发复用、写入后重读与无进展终止的回归测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentToolCallGuard, toolCallSignature } from '../agentToolCallGuard';

describe('request scoped tool execution', () => {
  it('canonicalizes nested objects while retaining array order', () => {
    expect(toolCallSignature(' FILE.READ ', { b: [{ z: 1, a: 2 }], a: 0 }))
      .toBe(toolCallSignature('file.read', { a: 0, b: [{ a: 2, z: 1 }] }));
    expect(toolCallSignature('file.read', [1, 2])).not.toBe(toolCallSignature('file.read', [2, 1]));
  });
  it.each([true, false])('coalesces pending and completed calls, including success=%s', async (success) => {
    const guard = new AgentToolCallGuard();
    const execute = vi.fn(() => Promise.resolve({ success, result: { id: 'once' } }));
    const results = await Promise.all([guard.run('todolist.create', {}, execute), guard.run('todolist.create', {}, execute)]);
    expect(results[0]).toBe(results[1]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(guard.stopped).toBe(false);
    await guard.run('todolist.create', {}, execute);
    expect(guard.stopped).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('allows a verification read after writes but never repeats a one-shot append', async () => {
    const guard = new AgentToolCallGuard();
    const execute = vi.fn(() => Promise.resolve({ success: true }));
    await guard.run('island.theme.get', {}, execute);
    await guard.run('file.append', { text: 'once' }, execute);
    await guard.run('island.theme.set', { mode: 'light' }, execute);
    await guard.run('island.theme.get', {}, execute);
    await guard.run('file.append', { text: 'once' }, execute);
    await guard.run('island.theme.set', { mode: 'dark' }, execute);
    await guard.run('island.theme.set', { mode: 'light' }, execute);
    expect(execute).toHaveBeenCalledTimes(6);
    await new AgentToolCallGuard().run('file.append', { text: 'once' }, execute);
    expect(execute).toHaveBeenCalledTimes(7);
  });
  it('never replays a whole-file write over later changes', async () => {
    const guard = new AgentToolCallGuard();
    const execute = vi.fn(() => Promise.resolve({ success: true }));
    await guard.run('file.write', { path: 'a', content: 'old' }, execute);
    await guard.run('file.append', { path: 'a', text: 'new' }, execute);
    await guard.run('file.write', { path: 'a', content: 'old' }, execute);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
