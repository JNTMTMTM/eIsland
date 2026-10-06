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
 * @file notificationSettingsInteractions.test.ts
 * @description 通知设置实际读取类型边界、异步取消及两个开关失败回滚回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationSettingsPage } from '../NotificationSettingsPage';
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
 * 执行实际通知设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => NotificationSettingsPage());
}
/**
 * 收集实际通知开关。
 * @returns 当前两个实际输入。
 */
function inputs() {
  return elements(render()).filter((node) => node.type === 'input');
}
/**
 * 等待服务与失败回滚队列。
 * @returns 当前队列完成。
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
describe('真实通知配置加载与取消', () => {
  it.each([true, false, 42])('保存值%o仅布尔覆盖默认', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual(typeof value === 'boolean' ? [value, value] : [true, false]);
    expect(api.storeRead).toHaveBeenCalledTimes(2);
  });
  it('读取拒绝保留默认状态', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, false]);
  });
  it('卸载后迟到值不改变任何开关', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    unmountHooks();
    resolve(false);
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, false]);
  });
});
describe('两个实际开关写入与失败回滚', () => {
  it.each([true, false])('保存失败=%s时恢复前值或保留新值', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    const [sound, agent] = inputs();
    invoke(sound, 'onChange', {
      target: {
        checked: false
      }
    });
    invoke(agent, 'onChange', {
      target: {
        checked: true
      }
    });
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([false, true]);
    expect(api.storeWrite).toHaveBeenCalledWith('notification-sound-enabled', false);
    expect(api.storeWrite).toHaveBeenCalledWith('agent-notification-enabled', true);
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual(failure ? [true, false] : [false, true]);
  });
});
