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
 * @file confirmPrompt.test.tsx
 * @description 验证危险脚本确认提示仅在输入 y 时确认
 * @author 鸡哥
 */

import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../core/i18n';
import { ConfirmPrompt } from '../confirmPrompt';

/**
 * 等待 Ink 处理输入
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 30);
});

/**
 * 渲染确认提示并输入按键
 * @param input - 用户输入
 * @returns 回调收到的参数列表
 */
async function answer(input: string): Promise<unknown[][]> {
  const onSubmit = vi.fn();
  const { stdin, lastFrame, unmount } = render(<ConfirmPrompt message="Publish?" onSubmit={onSubmit} />);
  await flush();
  expect(lastFrame()).toContain('Publish? (y/N)');
  stdin.write(input);
  await flush();
  unmount();
  return onSubmit.mock.calls;
}

beforeAll(() => initI18n('en-US'));

describe('ConfirmPrompt', () => {
  it('输入 y 或 Y 确认', async () => {
    expect(await answer('y')).toEqual([[true]]);
    expect(await answer('Y')).toEqual([[true]]);
  });

  it('回车默认拒绝', async () => {
    expect(await answer('\r')).toEqual([[false]]);
  });

  it('输入 n 拒绝，其他字符忽略', async () => {
    expect(await answer('n')).toEqual([[false]]);
    expect(await answer('x')).toEqual([]);
  });
});
