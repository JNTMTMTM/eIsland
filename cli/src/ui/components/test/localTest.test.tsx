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
 * @file localTest.test.tsx
 * @description 验证本机测试列表的选择与返回，以及 SMTC 测试的读取状态渲染与进程生命周期
 * @author 鸡哥
 */

import { render } from 'ink-testing-library';
import {
  beforeAll, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { initI18n } from '../../../core/i18n';
import { isSmtcSupported, watchSmtc } from '../../../core/smtc';
import LocalTest from '../localTest';

import type { SmtcSnapshot } from '../../../core/smtc';

vi.mock('../../../core/smtc', () => ({
  isSmtcSupported: vi.fn(() => true),
  watchSmtc: vi.fn(),
}));

const supportedMock = vi.mocked(isSmtcSupported);
const watchMock = vi.mocked(watchSmtc);
const stopMock = vi.fn();
const DOWN = '\u001B[B';
const ENTER = '\r';
const ESCAPE = '\u001B';

/**
 * 等待 Ink 处理输入并完成重新渲染
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 30);
});

/**
 * 获取最近一次启动读取时注册的回调
 * @returns 读取结果与错误回调
 */
const callbacks = (): { update: (snapshot: SmtcSnapshot) => void; fail: (message: string) => void } => {
  const [update, fail] = watchMock.mock.calls.at(-1) ?? [];
  if (!update || !fail) throw new Error('watchSmtc was not called');
  return { update, fail };
};

/**
 * 渲染本机测试并进入 SMTC 测试
 * @returns 渲染实例与返回主菜单回调
 */
async function openSmtc(): Promise<ReturnType<typeof render> & { onBack: ReturnType<typeof vi.fn> }> {
  const onBack = vi.fn();
  const instance = render(<LocalTest onBack={onBack} />);
  await flush();
  instance.stdin.write(ENTER);
  await flush();
  return { onBack, ...instance };
}

beforeAll(() => initI18n('en-US'));

beforeEach(() => {
  supportedMock.mockReturnValue(true);
  watchMock.mockReturnValue({ stop: stopMock });
});

describe('LocalTest', () => {
  it('列出 SMTC 测试项与返回主菜单', () => {
    const { lastFrame, unmount } = render(<LocalTest onBack={vi.fn()} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Local tests');
    expect(frame).toContain('SMTC');
    expect(frame).toContain('Back to main menu');
    unmount();
  });

  it('选中返回主菜单或按 Esc 时回调', async () => {
    const onBack = vi.fn();
    const { stdin, unmount } = render(<LocalTest onBack={onBack} />);
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write(ENTER);
    await flush();
    stdin.write(ESCAPE);
    await flush();
    expect(onBack).toHaveBeenCalledTimes(2);
    unmount();
  });
});

describe('SMTC 测试', () => {
  it('读取到会话前显示加载，读取后渲染字段与进度', async () => {
    const { lastFrame, unmount } = await openSmtc();
    expect(lastFrame()).toContain('Reading playback info');
    callbacks().update({
      app: 'Spotify.exe', title: 'Song', artist: 'Singer', album: '', status: 'Playing', position: 65, duration: 200, updated: 0,
    });
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Song');
    expect(frame).toContain('Singer');
    expect(frame).toContain('not provided');
    expect(frame).toContain('playing');
    expect(frame).toContain('1:05 / 3:20');
    expect(frame).toContain('Spotify.exe');
    unmount();
  });

  it('没有会话或没有时间线时分别提示', async () => {
    const { lastFrame, unmount } = await openSmtc();
    callbacks().update(null);
    await flush();
    expect(lastFrame()).toContain('No media session');
    callbacks().update({
      app: 'Games.exe', title: 'Game', artist: '', album: '', status: 'Paused', position: 0, duration: 0, updated: 0,
    });
    await flush();
    expect(lastFrame()).toContain('does not report playback progress');
    expect(lastFrame()).toContain('paused');
    unmount();
  });

  it('读取失败时显示原因', async () => {
    const { lastFrame, unmount } = await openSmtc();
    callbacks().fail('access denied');
    await flush();
    expect(lastFrame()).toContain('Failed to read: access denied');
    unmount();
  });

  it('非 Windows 不启动读取进程', async () => {
    supportedMock.mockReturnValue(false);
    const { lastFrame, unmount } = await openSmtc();
    expect(lastFrame()).toContain('only available on Windows');
    expect(watchMock).not.toHaveBeenCalled();
    unmount();
  });

  it('Esc 返回测试列表并结束读取进程', async () => {
    const { stdin, lastFrame, onBack, unmount } = await openSmtc();
    stdin.write(ESCAPE);
    await flush();
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
    expect(lastFrame()).toContain('Back to main menu');
    unmount();
  });
});
