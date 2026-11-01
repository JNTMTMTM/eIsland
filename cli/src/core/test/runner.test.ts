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
 * @file runner.test.ts
 * @description 验证 npm 脚本执行参数、退出码透传与 SIGINT 监听清理
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';

import spawn from 'cross-spawn';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import runScript from '../runner';

vi.mock('cross-spawn', () => ({ default: vi.fn() }));

const spawnMock = vi.mocked(spawn);
let child: EventEmitter;

beforeEach(() => {
  child = new EventEmitter();
  spawnMock.mockReturnValue(child as ReturnType<typeof spawn>);
});

describe('runScript', () => {
  it('在仓库根目录执行 npm run 并透传退出码', async () => {
    const pending = runScript('/repo', 'test:main', []);
    child.emit('close', 3);
    await expect(pending).resolves.toBe(3);
    expect(spawnMock).toHaveBeenCalledWith('npm', ['run', 'test:main'], { cwd: '/repo', stdio: 'inherit' });
  });

  it('透传参数置于 -- 之后', async () => {
    const pending = runScript('/repo', 'test', ['--watch', 'a b']);
    child.emit('close', 0);
    await pending;
    expect(spawnMock).toHaveBeenCalledWith('npm', ['run', 'test', '--', '--watch', 'a b'], expect.anything());
  });

  it('信号终止时返回 130', async () => {
    const pending = runScript('/repo', 'dev', []);
    child.emit('close', null);
    await expect(pending).resolves.toBe(130);
  });

  it('启动失败时拒绝并移除 SIGINT 监听', async () => {
    const before = process.listenerCount('SIGINT');
    const pending = runScript('/repo', 'dev', []);
    expect(process.listenerCount('SIGINT')).toBe(before + 1);
    child.emit('error', new Error('ENOENT'));
    await expect(pending).rejects.toThrow('ENOENT');
    expect(process.listenerCount('SIGINT')).toBe(before);
  });
});
