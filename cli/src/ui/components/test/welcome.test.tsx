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
 * @file welcome.test.tsx
 * @description 验证欢迎界面的字符画、主菜单选择与退出确认，以及主菜单与各功能界面之间的切换
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';

import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { LOGO_LINES } from '../../config/uiConfig';
import { initI18n } from '../../../core/i18n';
import InteractiveApp from '../interactiveApp';
import Welcome from '../welcome';

import type { Task, TaskManager } from '../../../core/taskManager';

const DOWN = '\u001B[B';
const ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

/**
 * 等待 Ink 处理输入并完成重新渲染
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 30);
});

// useSyncExternalStore 要求快照在变化前保持同一引用。
const NO_TASKS: readonly Task[] = [];
const RUNNING: readonly Task[] = [{ id: 1, name: 'dev', status: 'running', code: null, lines: [] }];

/**
 * 创建返回固定快照的任务管理器
 * @param snapshot - 任务快照
 * @returns 任务管理器
 */
const staticManager = (snapshot: readonly Task[]): TaskManager => ({
  start: vi.fn(),
  kill: vi.fn(),
  remove: vi.fn(),
  killAll: vi.fn(() => Promise.resolve()),
  subscribe: () => () => {},
  getSnapshot: () => snapshot,
});

beforeAll(() => initI18n('en-US'));

describe('Welcome', () => {
  it('字符画各行等宽，避免居中后错位', () => {
    expect(new Set(LOGO_LINES.map((line) => line.text.length)).size).toBe(1);
  });

  it('展示字符画、副标题、主菜单与提示', () => {
    const { lastFrame, unmount } = render(<Welcome manager={staticManager(NO_TASKS)} onSelect={vi.fn()} onQuit={vi.fn()} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain(LOGO_LINES[0].text.trimEnd());
    expect(frame).toContain('Repository script console');
    // 仓库管理是第一个功能。
    expect(frame.indexOf('Repository ')).toBeLessThan(frame.indexOf('Local tests'));
    expect(frame).toContain('Enter open');
    unmount();
  });

  it('方向键选择功能后 Enter 进入，Esc 退出', async () => {
    const onSelect = vi.fn();
    const onQuit = vi.fn();
    const { stdin, unmount } = render(<Welcome manager={staticManager(NO_TASKS)} onSelect={onSelect} onQuit={onQuit} />);
    await flush();
    stdin.write('\r');
    await flush();
    expect(onSelect).toHaveBeenLastCalledWith('repo');
    stdin.write(DOWN);
    await flush();
    stdin.write('\r');
    await flush();
    expect(onSelect).toHaveBeenLastCalledWith('localTest');
    stdin.write('\u001B');
    await flush();
    expect(onQuit).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('仍有运行中的任务时退出需确认', async () => {
    const onQuit = vi.fn();
    const { stdin, lastFrame, unmount } = render(<Welcome manager={staticManager(RUNNING)} onSelect={vi.fn()} onQuit={onQuit} />);
    await flush();
    stdin.write('\u001B');
    await flush();
    expect(lastFrame()).toContain('1 task(s) still running');
    stdin.write('n');
    await flush();
    expect(onQuit).not.toHaveBeenCalled();
    stdin.write('\u001B');
    await flush();
    stdin.write('y');
    await flush();
    expect(onQuit).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('InteractiveApp', () => {
  it('进入仓库管理后可返回主菜单', async () => {
    const { stdin, lastFrame, unmount } = render(
      <InteractiveApp manager={staticManager(NO_TASKS)} root={ROOT} skipConfirm={false} passthrough={[]} onQuit={vi.fn()} />,
    );
    await flush();
    stdin.write('\r');
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Enter open');
    // 输出面板在上，操作区在下。
    expect(frame.indexOf('No tasks yet')).toBeLessThan(frame.indexOf('Run script...'));
    stdin.write(DOWN);
    await flush();
    stdin.write('\r');
    await flush();
    expect(lastFrame()).toContain('Enter open');
    unmount();
  });

  it('进入本机测试后 Esc 返回主菜单', async () => {
    const { stdin, lastFrame, unmount } = render(
      <InteractiveApp manager={staticManager(NO_TASKS)} root={ROOT} skipConfirm={false} passthrough={[]} onQuit={vi.fn()} />,
    );
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write('\r');
    await flush();
    expect(lastFrame()).toContain('Read what is playing now');
    stdin.write('\u001B');
    await flush();
    expect(lastFrame()).toContain('Enter open');
    unmount();
  });
});
