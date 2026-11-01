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
 * @file scriptPicker.test.tsx
 * @description 验证脚本选择器的过滤、光标移动、选中与取消
 * @author 鸡哥
 */

import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../core/i18n';
import { ScriptPicker } from '../scriptPicker';

import type { ScriptEntry } from '../../core/scripts';

const entry = (name: string, dangerous = false): ScriptEntry => ({
  name, dangerous, command: `run ${name}`, group: name.split(':')[0], hidden: false,
});
const entries = [entry('dev'), entry('test:main'), entry('test:renderer'), entry('release:upload', true)];
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

beforeAll(() => initI18n('en-US'));

describe('ScriptPicker', () => {
  it('展示脚本说明、危险标记与操作提示', () => {
    const { lastFrame, unmount } = render(<ScriptPicker entries={entries} onSubmit={vi.fn()} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Run main process unit and integration tests');
    expect(frame).toContain('[dangerous]');
    expect(frame).toContain('Esc cancel');
    unmount();
  });

  it('输入关键词过滤后回车选中当前脚本', async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame, unmount } = render(<ScriptPicker entries={entries} onSubmit={onSubmit} />);
    await flush();
    stdin.write('renderer');
    await flush();
    expect(lastFrame()).not.toContain('test:main');
    stdin.write(ENTER);
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(entries[2]);
    unmount();
  });

  it('方向键移动光标', async () => {
    const onSubmit = vi.fn();
    const { stdin, unmount } = render(<ScriptPicker entries={entries} onSubmit={onSubmit} />);
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write(ENTER);
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(entries[1]);
    unmount();
  });

  it('无匹配时回车不提交，Esc 取消', async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame, unmount } = render(<ScriptPicker entries={entries} onSubmit={onSubmit} />);
    await flush();
    stdin.write('zzz');
    await flush();
    expect(lastFrame()).toContain('No matching scripts');
    stdin.write(ENTER);
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();
    stdin.write(ESCAPE);
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(null);
    unmount();
  });
});
