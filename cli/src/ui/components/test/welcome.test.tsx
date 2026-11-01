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
 * @description 验证欢迎界面的字符画展示、进入与退出，以及进入后切换到任务界面
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
const emptyManager: TaskManager = {
  start: vi.fn(),
  kill: vi.fn(),
  remove: vi.fn(),
  killAll: vi.fn(() => Promise.resolve()),
  subscribe: () => () => {},
  getSnapshot: () => NO_TASKS,
};

beforeAll(() => initI18n('en-US'));

describe('Welcome', () => {
  it('字符画各行等宽，避免居中后错位', () => {
    expect(new Set(LOGO_LINES.map((line) => line.text.length)).size).toBe(1);
  });

  it('展示字符画、副标题与进入提示', () => {
    const { lastFrame, unmount } = render(<Welcome onEnter={vi.fn()} onQuit={vi.fn()} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain(LOGO_LINES[0].text.trimEnd());
    expect(frame).toContain('Repository script console');
    expect(frame).toContain('Press Enter to start');
    unmount();
  });

  it('Enter 进入，Esc 退出', async () => {
    const onEnter = vi.fn();
    const onQuit = vi.fn();
    const { stdin, unmount } = render(<Welcome onEnter={onEnter} onQuit={onQuit} />);
    await flush();
    stdin.write('\r');
    await flush();
    expect(onEnter).toHaveBeenCalledTimes(1);
    stdin.write('\u001B');
    await flush();
    expect(onQuit).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('InteractiveApp', () => {
  it('Enter 后由欢迎界面切换到上下布局的任务界面', async () => {
    const { stdin, lastFrame, unmount } = render(
      <InteractiveApp manager={emptyManager} root={ROOT} skipConfirm={false} passthrough={[]} onQuit={vi.fn()} />,
    );
    await flush();
    expect(lastFrame()).toContain('Press Enter to start');
    stdin.write('\r');
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Press Enter to start');
    // 输出面板在上，操作区在下。
    expect(frame.indexOf('No tasks yet')).toBeLessThan(frame.indexOf('Run script...'));
    unmount();
  });
});
