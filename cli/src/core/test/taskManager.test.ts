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
 * @file taskManager.test.ts
 * @description 验证并发任务的启动参数、输出捕获、状态流转、进程树结束与订阅通知
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import spawn from 'cross-spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import createTaskManager from '../taskManager';

vi.mock('cross-spawn', () => ({ default: vi.fn() }));

/** 模拟的 npm 子进程 */
interface FakeChild extends EventEmitter {
  pid: number;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
}

const spawnMock = vi.mocked(spawn);
const originalPlatform = process.platform;
let children: FakeChild[];

/**
 * 模拟运行平台
 * @param platform - 平台标识
 */
function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

/**
 * 等待合并通知的定时器触发
 * @returns 通知间隔之后的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 80);
});

beforeEach(() => {
  children = [];
  spawnMock.mockImplementation((command) => {
    const child = Object.assign(new EventEmitter(), {
      pid: 1000 + children.length, stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(),
    });
    // taskkill 本身不是被管理的任务，不计入 children。
    if (command === 'npm') children.push(child);
    return child as unknown as ReturnType<typeof spawn>;
  });
});

afterEach(() => setPlatform(originalPlatform));

describe('createTaskManager', () => {
  it('以管道捕获输出并强制开启颜色，透传参数置于 -- 之后', () => {
    const manager = createTaskManager('/repo');
    manager.start('test', ['--watch']);
    const [[command, args, options]] = spawnMock.mock.calls;
    expect([command, args]).toEqual(['npm', ['run', 'test', '--', '--watch']]);
    expect(options).toMatchObject({ cwd: '/repo', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(options?.env?.FORCE_COLOR).toBe('1');
  });

  it('合并 stdout 与 stderr 输出，并包含未换行的末尾片段', async () => {
    const manager = createTaskManager('/repo');
    const { id } = manager.start('dev', []);
    children[0].stdout.write('line 1\nline ');
    children[0].stderr.write('err\n');
    children[0].stdout.write('2');
    await flush();
    expect(manager.getSnapshot().find((task) => task.id === id)?.lines).toEqual(['line 1', 'line err', '2']);
  });

  it('退出码决定成功或失败状态', () => {
    const manager = createTaskManager('/repo');
    manager.start('a', []);
    manager.start('b', []);
    children[0].emit('close', 0);
    children[1].emit('close', 2);
    expect(manager.getSnapshot().map(({ status, code }) => ({ status, code }))).toEqual([
      { status: 'succeeded', code: 0 },
      { status: 'failed', code: 2 },
    ]);
  });

  it('Windows 上以 taskkill /T 结束进程树，退出后标记为已结束', () => {
    setPlatform('win32');
    const manager = createTaskManager('/repo');
    const { id } = manager.start('dev', []);
    manager.kill(id);
    manager.kill(id);
    expect(spawnMock).toHaveBeenCalledWith('taskkill', ['/pid', '1000', '/T', '/F'], expect.anything());
    expect(spawnMock.mock.calls.filter(([command]) => command === 'taskkill')).toHaveLength(1);
    children[0].emit('close', 1);
    expect(manager.getSnapshot()[0].status).toBe('killed');
  });

  it('类 Unix 平台向进程组发送 SIGTERM', () => {
    setPlatform('linux');
    const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);
    const manager = createTaskManager('/repo');
    const { id } = manager.start('dev', []);
    manager.kill(id);
    expect(killSpy).toHaveBeenCalledWith(-1000, 'SIGTERM');
  });

  it('仅移除已结束的任务', () => {
    const manager = createTaskManager('/repo');
    const running = manager.start('dev', []);
    const done = manager.start('lint', []);
    children[1].emit('close', 0);
    manager.remove(running.id);
    manager.remove(done.id);
    expect(manager.getSnapshot().map((task) => task.name)).toEqual(['dev']);
  });

  it('超出最大行数时丢弃最早的输出', async () => {
    const manager = createTaskManager('/repo', 3);
    manager.start('dev', []);
    children[0].stdout.write('1\n2\n3\n4\n5\n');
    await flush();
    expect(manager.getSnapshot()[0].lines).toEqual(['3', '4', '5']);
  });

  it('启动失败时记录错误并标记失败', () => {
    const manager = createTaskManager('/repo');
    manager.start('dev', []);
    children[0].emit('error', new Error('spawn npm ENOENT'));
    expect(manager.getSnapshot()[0]).toMatchObject({ status: 'failed', code: 1, lines: ['spawn npm ENOENT'] });
  });

  it('killAll 结束全部运行中的任务并等待退出', async () => {
    setPlatform('win32');
    const manager = createTaskManager('/repo');
    manager.start('dev', []);
    manager.start('test', []);
    const pending = manager.killAll();
    children.forEach((child) => child.emit('close', 1));
    await pending;
    expect(manager.getSnapshot().map((task) => task.status)).toEqual(['killed', 'killed']);
  });

  it('状态变化通知订阅者，取消订阅后不再通知', () => {
    const manager = createTaskManager('/repo');
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    manager.start('dev', []);
    expect(listener).toHaveBeenCalledTimes(1);
    const before = manager.getSnapshot();
    expect(manager.getSnapshot()).toBe(before);
    unsubscribe();
    children[0].emit('close', 0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
