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
 * @file smtc.test.ts
 * @description 验证 SMTC 输出解析、平台判断，以及读取进程的启动参数、分行解析、错误与结束处理
 * @author 鸡哥
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSmtcSupported, parseSmtcLine, watchSmtc } from '../smtc';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

/** 模拟的子进程 */
interface FakeChild extends EventEmitter {
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
}

const spawnMock = vi.mocked(spawn);
let child: FakeChild;

/**
 * 等待流数据事件派发
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

beforeEach(() => {
  child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn() });
  spawnMock.mockReturnValue(child as unknown as ReturnType<typeof spawn>);
});

describe('parseSmtcLine', () => {
  it('解析会话字段，缺失或类型不符时取默认值', () => {
    expect(parseSmtcLine('{"active":true,"title":"Song","artist":null,"position":12.5,"duration":"x","status":"Playing"}')).toEqual({
      app: '', title: 'Song', artist: '', album: '', status: 'Playing', position: 12.5, duration: 0, updated: 0,
    });
  });

  it('没有会话返回 null，无法解析返回 undefined', () => {
    expect(parseSmtcLine('{"active":false}')).toBeNull();
    expect(parseSmtcLine('WARNING: something')).toBeUndefined();
  });
});

describe('isSmtcSupported', () => {
  it('仅 Windows 支持', () => {
    expect(isSmtcSupported('win32')).toBe(true);
    expect(isSmtcSupported('darwin')).toBe(false);
    expect(isSmtcSupported('linux')).toBe(false);
  });
});

describe('watchSmtc', () => {
  it('以编码命令启动系统 PowerShell，不依赖仓库文件', () => {
    watchSmtc(vi.fn(), vi.fn());
    const [[command, args, options]] = spawnMock.mock.calls;
    expect(command).toBe('powershell.exe');
    expect(args).toEqual(expect.arrayContaining(['-NoProfile', '-NonInteractive', '-EncodedCommand']));
    const script = Buffer.from(args.at(-1) ?? '', 'base64').toString('utf16le');
    expect(script).toContain('GlobalSystemMediaTransportControlsSessionManager');
    expect(options).toEqual(expect.objectContaining({ windowsHide: true }));
    expect(options).not.toHaveProperty('cwd');
  });

  it('跨数据块拼接行并忽略无法解析的行', async () => {
    const onUpdate = vi.fn();
    watchSmtc(onUpdate, vi.fn());
    child.stdout.write('{"active":fa');
    child.stdout.write('lse}\r\nnoise\r\n{"active":true,"title":"A"}\r\n');
    await flush();
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenNthCalledWith(1, null);
    expect(onUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: 'A' }));
  });

  it('异常退出时回调错误输出的首行', async () => {
    const onError = vi.fn();
    watchSmtc(vi.fn(), onError);
    child.stderr.write('Unable to find type\r\nat line 1\r\n');
    await flush();
    child.emit('close', 1);
    expect(onError).toHaveBeenCalledWith('Unable to find type');
  });

  it('启动失败时回调错误信息', () => {
    const onError = vi.fn();
    watchSmtc(vi.fn(), onError);
    child.emit('error', new Error('spawn powershell.exe ENOENT'));
    expect(onError).toHaveBeenCalledWith('spawn powershell.exe ENOENT');
  });

  it('主动结束后不再回调错误', () => {
    const onError = vi.fn();
    const watcher = watchSmtc(vi.fn(), onError);
    watcher.stop();
    child.emit('close', null);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
