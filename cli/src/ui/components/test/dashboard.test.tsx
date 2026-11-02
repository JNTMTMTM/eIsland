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
 * @file dashboard.test.tsx
 * @description 验证分栏界面的任务启动、结束、关闭、切换、翻看、危险确认与退出流程
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';

import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../core/i18n';
import Dashboard from '../dashboard';

import type { Task, TaskManager } from '../../../core/taskManager';

const ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const DOWN = '\u001B[B';
const ENTER = '\r';
const TAB = '\t';
const PAGE_UP = '\u001B[5~';
const END = '\u001B[F';

/** 带调用记录的模拟任务管理器 */
interface FakeManager extends TaskManager {
  start: ReturnType<typeof vi.fn<TaskManager['start']>>;
  kill: ReturnType<typeof vi.fn<TaskManager['kill']>>;
  remove: ReturnType<typeof vi.fn<TaskManager['remove']>>;
}

/**
 * 创建模拟任务管理器
 * @param initial - 初始任务
 * @returns 启动任务时追加运行中快照并通知订阅者的管理器
 */
function fakeManager(initial: Task[] = []): FakeManager {
  let snapshot: readonly Task[] = initial;
  const listeners = new Set<() => void>();
  return {
    start: vi.fn((name: string) => {
      const task: Task = { name, id: snapshot.length + 1, status: 'running', code: null, lines: [] };
      snapshot = [...snapshot, task];
      listeners.forEach((listener) => listener());
      return task;
    }),
    kill: vi.fn(),
    remove: vi.fn(),
    killAll: vi.fn(() => Promise.resolve()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
}

const task = (id: number, status: Task['status'], lines: string[] = []): Task => ({
  id, status, lines, name: `task-${id}`, code: status === 'running' ? null : 0,
});

/**
 * 等待 Ink 处理输入并完成重新渲染
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 30);
});

/**
 * 渲染分栏界面
 * @param manager - 任务管理器
 * @param skipConfirm - 是否跳过危险脚本确认
 * @returns 渲染实例与退出回调
 */
async function mount(manager: TaskManager, skipConfirm = false): Promise<ReturnType<typeof render> & { onQuit: ReturnType<typeof vi.fn>; onBack: ReturnType<typeof vi.fn> }> {
  const onQuit = vi.fn();
  const onBack = vi.fn();
  const instance = render(<Dashboard manager={manager} root={ROOT} skipConfirm={skipConfirm} passthrough={[]} onQuit={onQuit} onBack={onBack} />);
  await flush();
  return { onQuit, onBack, ...instance };
}

/**
 * 依次输入按键，每次输入后等待渲染
 * @param stdin - 渲染实例的输入流
 * @param keys - 按键序列
 */
async function press(stdin: ReturnType<typeof render>['stdin'], ...keys: string[]): Promise<void> {
  await keys.reduce(async (previous, key) => {
    await previous;
    stdin.write(key);
    await flush();
  }, Promise.resolve());
}

beforeAll(() => initI18n('en-US'));

describe('Dashboard', () => {
  it('没有任务时提示运行脚本且不提供结束操作', async () => {
    const { lastFrame, unmount } = await mount(fakeManager());
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No tasks yet');
    expect(frame).toContain('Run script...');
    expect(frame).not.toContain('End current task');
    unmount();
  });

  it('在选择器中选中脚本后启动任务', async () => {
    const manager = fakeManager();
    const { stdin, lastFrame, unmount } = await mount(manager);
    await press(stdin, ENTER);
    expect(lastFrame()).toContain('Search scripts');
    await press(stdin, 'test:main', ENTER);
    expect(manager.start).toHaveBeenCalledWith('test:main', []);
    expect(lastFrame()).toContain('● test:main running');
    expect(lastFrame()).toContain('test:main (1/1)');
    unmount();
  });

  it('结束当前运行中的任务', async () => {
    const manager = fakeManager([task(1, 'running')]);
    const { stdin, lastFrame, unmount } = await mount(manager);
    expect(lastFrame()).toContain('End current task');
    await press(stdin, DOWN, ENTER);
    expect(manager.kill).toHaveBeenCalledWith(1);
    unmount();
  });

  it('关闭已结束的当前任务', async () => {
    const manager = fakeManager([task(1, 'succeeded')]);
    const { stdin, lastFrame, unmount } = await mount(manager);
    expect(lastFrame()).toContain('Close current task');
    await press(stdin, DOWN, ENTER);
    expect(manager.remove).toHaveBeenCalledWith(1);
    unmount();
  });

  it('Tab 在任务间切换，默认查看最新任务', async () => {
    const { stdin, lastFrame, unmount } = await mount(fakeManager([task(1, 'succeeded'), task(2, 'running')]));
    expect(lastFrame()).toContain('task-2 (2/2)');
    await press(stdin, TAB);
    expect(lastFrame()).toContain('task-1 (1/2)');
    unmount();
  });

  it('PgUp 翻看历史输出并暂停跟随，End 恢复跟随', async () => {
    const lines = Array.from({ length: 100 }, (value, index) => `line-${index}`);
    const { stdin, lastFrame, unmount } = await mount(fakeManager([task(1, 'running', lines)]));
    expect(lastFrame()).toContain('line-99');
    await press(stdin, PAGE_UP);
    expect(lastFrame()).toContain('Paused');
    expect(lastFrame()).not.toContain('line-99');
    await press(stdin, END);
    expect(lastFrame()).toContain('line-99');
    unmount();
  });

  it('危险脚本需在右侧确认后才启动', async () => {
    const manager = fakeManager();
    const { stdin, lastFrame, unmount } = await mount(manager);
    await press(stdin, ENTER, 'esa:purge-all', ENTER);
    expect(lastFrame()).toContain('(y/N)');
    expect(manager.start).not.toHaveBeenCalled();
    await press(stdin, 'y');
    expect(manager.start).toHaveBeenCalledWith('esa:purge-all', []);
    unmount();
  });

  it('--yes 跳过危险脚本确认', async () => {
    const manager = fakeManager();
    const { stdin, unmount } = await mount(manager, true);
    await press(stdin, ENTER, 'esa:purge-all', ENTER);
    expect(manager.start).toHaveBeenCalledWith('esa:purge-all', []);
    unmount();
  });

  it('有运行中任务时退出需确认', async () => {
    const { stdin, lastFrame, onQuit, unmount } = await mount(fakeManager([task(1, 'running')]));
    await press(stdin, DOWN, DOWN, DOWN, ENTER);
    expect(lastFrame()).toContain('1 task(s) still running');
    expect(onQuit).not.toHaveBeenCalled();
    await press(stdin, 'y');
    expect(onQuit).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('返回主菜单不结束运行中的任务', async () => {
    const manager = fakeManager([task(1, 'running')]);
    const { stdin, lastFrame, onBack, onQuit, unmount } = await mount(manager);
    expect(lastFrame()).toContain('Back to main menu');
    await press(stdin, DOWN, DOWN, ENTER);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onQuit).not.toHaveBeenCalled();
    expect(manager.kill).not.toHaveBeenCalled();
    unmount();
  });

  it('没有运行中任务时 Ctrl+C 直接退出', async () => {
    const { stdin, onQuit, unmount } = await mount(fakeManager([task(1, 'failed')]));
    await press(stdin, '\u0003');
    expect(onQuit).toHaveBeenCalledTimes(1);
    unmount();
  });
});
