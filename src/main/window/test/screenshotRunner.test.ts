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
 * @file screenshotRunner.test.ts
 * @description 使用可控进程边界与时钟验证截图任务排队、取消和排队期间的硬截止时间。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createScreenshotRunner } from '../screenshotRunner';

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn }));

/**
 * 创建可手动发送数据和关闭事件的进程边界。
 * @returns 不启动操作系统进程的测试替身
 */
function createChild() {
  return Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stdin: new PassThrough(), kill: vi.fn(() => true),
  });
}
let runner: ReturnType<typeof createScreenshotRunner>;
let children: Array<ReturnType<typeof createChild>>;
beforeEach(() => {
  vi.useFakeTimers();
  children = [];
  spawn.mockReset().mockImplementation(() => {
    const child = createChild(); children.push(child); return child;
  });
  runner = createScreenshotRunner('fixture.cjs', 1000);
});
afterEach(() => {
  runner.dispose();
  children.forEach((child) => { child.stdout.destroy(); child.stdin.destroy(); });
  vi.useRealTimers();
});
/**
 * 完成指定的进程请求，按真实管道顺序先发数据再关闭。
 * @param index - 已启动的进程序号
 * @param response - 二进制响应的文本内容
 */
function complete(index: number, response: string): void {
  children[index].stdout.write(Buffer.from(response));
  children[index].emit('close', 0);
}

it('主屏与选区任务交错时等待一个槽位，不把忙碌误判为原生失败', async () => {
  const windows = runner.run('windows');
  const primary = runner.run('primary');
  expect(children).toHaveLength(1);
  expect(await runner.run('all')).toBeNull();

  complete(0, 'windows');
  expect(await windows).toEqual(Buffer.from('windows'));
  expect(children).toHaveLength(2);
  const all = runner.run('all');
  expect(children).toHaveLength(2);
  complete(1, 'primary');
  expect(await primary).toEqual(Buffer.from('primary'));
  expect(children).toHaveLength(3);
  complete(2, 'all');
  expect(await all).toEqual(Buffer.from('all'));
  expect(spawn.mock.calls.map((call) => (call[1] as string[])[1])).toEqual(['windows', 'primary', 'all']);

  const active = runner.run('windows');
  const controller = new AbortController();
  const prepareBitmap = vi.fn(() => ({ data: Buffer.alloc(4), width: 1, height: 1 }));
  const encoding = runner.run('encode', controller.signal, prepareBitmap);
  controller.abort();
  expect(await encoding).toBeNull();
  expect(prepareBitmap).not.toHaveBeenCalled();
  expect(children).toHaveLength(4);
  complete(3, 'windows');
  expect(await active).toEqual(Buffer.from('windows'));
});

it('排队时间计入硬截止时间，启动后不会重新获得完整超时窗口', async () => {
  const active = runner.run('windows');
  await vi.advanceTimersByTimeAsync(600);
  const queued = runner.run('primary');
  await vi.advanceTimersByTimeAsync(400);
  expect(children[0].kill).toHaveBeenCalledExactlyOnceWith('SIGKILL');
  expect(children).toHaveLength(1);
  children[0].emit('close', null);
  expect(await active).toBeNull();
  expect(children).toHaveLength(2);

  await vi.advanceTimersByTimeAsync(599);
  expect(children[1].kill).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(children[1].kill).toHaveBeenCalledExactlyOnceWith('SIGKILL');
  children[1].emit('close', null);
  expect(await queued).toBeNull();

  const recovered = runner.run('all');
  complete(2, 'all');
  expect(await recovered).toEqual(Buffer.from('all'));
});
