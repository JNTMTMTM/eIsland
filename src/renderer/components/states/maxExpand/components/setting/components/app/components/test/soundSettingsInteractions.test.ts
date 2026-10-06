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
 * @file soundSettingsInteractions.test.ts
 * @description 声音设置真实配置读取、卸载取消及全部音量输入换算边界回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundSettingsPage } from '../SoundSettingsPage';
import { elementProps, elements, invoke } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
/**
 * 重绘实际声音设置。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => SoundSettingsPage());
}
/**
 * 获取实际三个音量滑条。
 * @returns 实际输入元素集合。
 */
function inputs() {
  return elements(render()).filter((node) => node.type === 'input');
}
/**
 * 等待真实配置读取队列。
 * @returns 当前服务完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实声音读取生命周期', () => {
  it.each([{
    value: 0.345,
    expected: 35
  }, {
    value: -1,
    expected: 0
  }, {
    value: 2,
    expected: 100
  }, {
    value: NaN,
    expected: 100
  }, {
    value: Infinity,
    expected: 100
  }, {
    value: 'damaged',
    expected: 100
  }])('保存值$value转换为$expected%', async ({
    value,
    expected
  }) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).value)).toEqual([expected, expected, expected]);
    expect(api.storeRead).toHaveBeenCalledTimes(3);
  });
  it('读取拒绝保留三个默认音量', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).value)).toEqual([100, 100, 100]);
  });
  it('卸载后延迟音量返回不更新', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    unmountHooks();
    resolve(0.2);
    await settle();
    expect(inputs().map((node) => elementProps(node).value)).toEqual([100, 100, 100]);
  });
});
describe('真实音量输入换算', () => {
  it.each([{
    input: '34.5',
    percent: 34.5,
    volume: 0.345
  }, {
    input: '-10',
    percent: 0,
    volume: 0
  }, {
    input: 'Infinity',
    percent: 100,
    volume: 1
  }, {
    input: '150',
    percent: 100,
    volume: 1
  }, {
    input: 'invalid',
    percent: 0,
    volume: 0
  }, {
    input: '',
    percent: 0,
    volume: 0
  }])('输入$input实际持久化$volume', ({
    input,
    percent,
    volume
  }) => {
    inputs().forEach((node) => {
      invoke(node, 'onChange', {
        target: {
          value: input
        }
      });
    });
    expect(inputs().map((node) => elementProps(node).value)).toEqual([percent, percent, percent]);
    expect(api.storeWrite.mock.calls).toEqual([['sound-volume-global', volume], ['sound-volume-alarm', volume], ['sound-volume-effect', volume]]);
  });
});
