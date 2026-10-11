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
 * @file smtcCommandBroker.test.ts
 * @description 验证命令截止时真正杀进程、重新创建、空闲回收和 seek 末值队列。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSmtcCommandBroker } from '../smtcCommandBroker';
import type { SmtcCommandRequest } from '../smtcCommandProtocol';
const io = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: io.spawn }));
class Child extends EventEmitter {
  send = vi.fn();
  kill = vi.fn();
}
let children: Child[];
let broker: ReturnType<typeof createSmtcCommandBroker>;
const request = (requestId: number, command: SmtcCommandRequest['command'] = 'play', lifetime = 4000): SmtcCommandRequest => ({ type: 'command', requestId, command, sourceAppId: 'player', argument: requestId, deadline: Date.now() + lifetime });
beforeEach(() => {
  vi.useFakeTimers(); children = [];
  io.spawn.mockImplementation(() => { const child = new Child(); children.push(child); return child; });
  broker = createSmtcCommandBroker('/commands.js');
});
afterEach(() => { broker.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('SMTC 隔离命令进程', () => {
  it('未操作时无子进程，重复命令复用，排队 seek 合并，空闲回收', () => {
    const reply = vi.fn();
    expect(children).toHaveLength(0);
    broker.execute(request(1), reply);
    broker.execute(request(2, 'seek'), reply);
    broker.execute(request(3, 'seek'), reply);
    expect(children).toHaveLength(1);
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ requestId: 2, result: { success: false, error: 'Seek superseded' } }));
    children[0].emit('message', { type: 'command-result', requestId: 1, result: { success: true, error: null } });
    expect(children[0].send).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: 3 }), expect.any(Function));
    children[0].emit('message', { type: 'command-result', requestId: 3, result: { success: true, error: null } });
    vi.advanceTimersByTime(5000);
    expect(children[0].kill).toHaveBeenCalledOnce();
    broker.execute(request(4), reply);
    expect(children).toHaveLength(2);
  });
  it('原生永不回应时硬杀故障进程并为下一请求重建，忽略旧进程回应', () => {
    const reply = vi.fn();
    broker.execute(request(1, 'play', 100), reply);
    broker.execute(request(2, 'pause', 500), reply);
    let tick = false; setTimeout(() => { tick = true; }, 20);
    vi.advanceTimersByTime(100);
    expect(tick).toBe(true);
    expect(children[0].kill).toHaveBeenCalledOnce();
    expect(children).toHaveLength(2);
    children[0].emit('message', { type: 'command-result', requestId: 1, result: { success: true } });
    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply.mock.calls[0][0].result.success).toBe(false);
    children[1].emit('message', { type: 'command-result', requestId: 2, result: { success: true, error: null } });
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: 2, result: { success: true, error: null } }));
  });
  it('取消执行和退出清理终止进程，过期请求不启动进程', () => {
    const reply = vi.fn();
    broker.execute(request(1, 'getTimestamp', 0), reply);
    expect(children).toHaveLength(0);
    expect(reply.mock.calls[0][0].result.isAvailable).toBe(false);
    broker.execute(request(2), reply); broker.cancel(2);
    expect(children[0].kill).toHaveBeenCalledOnce();
    broker.execute(request(3), reply); broker.execute(request(4), reply); broker.dispose();
    expect(children[1].kill).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});
