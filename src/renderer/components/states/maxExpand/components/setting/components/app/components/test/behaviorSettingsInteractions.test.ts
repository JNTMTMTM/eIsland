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
 * @file behaviorSettingsInteractions.test.ts
 * @description 行为设置真实配置迁移、异步取消、外部订阅和持久化错误回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSettingsPage } from '../BehaviorSettingsPage';
import { elementProps, elements, invoke } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ComponentProps } from 'react';
const store = vi.hoisted(() => ({
  setNotification: vi.fn()
}));
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
vi.mock('../../../../../../../../../store/slices', () => ({
  default: (selector: (state: typeof store) => unknown) => selector(store)
}));
const unsubscribe = vi.fn<() => void>();
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  settingsPreview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  idleClickExpandGet: vi.fn<() => Promise<boolean>>(),
  shapeModeGet: vi.fn<() => Promise<string>>(),
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>(),
  shapeModeSet: vi.fn<(value: string) => Promise<void>>(),
  idleClickExpandSet: vi.fn<(value: boolean) => Promise<void>>(),
  expandMouseleaveIdleSet: vi.fn<(value: boolean) => Promise<void>>(),
  maxexpandMouseleaveIdleSet: vi.fn<(value: boolean) => Promise<void>>()
};
let props: ComponentProps<typeof BehaviorSettingsPage>;
/**
 * 重绘真实行为设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => BehaviorSettingsPage(props));
}
/**
 * 等待读取和失败回调队列。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 收集实际单选组的选中值。
 * @param name - 实际输入组名称。
 * @returns 按页面顺序排列的真实选中值。
 */
function checked(name: string) {
  return elements(render()).filter((node) => elementProps(node).name === name).map((node) => elementProps(node).checked);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  props = {
    expandLeaveIdle: true,
    setExpandLeaveIdle: vi.fn(),
    maxExpandLeaveIdle: true,
    setMaxExpandLeaveIdle: vi.fn()
  };
  api.storeRead.mockResolvedValue(undefined);
  api.idleClickExpandGet.mockResolvedValue(false);
  api.shapeModeGet.mockResolvedValue('notch');
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  [api.storeWrite, api.settingsPreview, api.shapeModeSet, api.idleClickExpandSet, api.expandMouseleaveIdleSet, api.maxexpandMouseleaveIdleSet].forEach((mock) => {
    mock.mockResolvedValue(undefined);
  });
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实初始化和旧配置迁移', () => {
  it.each([{
    modern: 'standalone',
    legacy: 'integrated',
    expected: [false, true],
    reads: 0
  }, {
    modern: 'integrated',
    legacy: 'standalone',
    expected: [false, true],
    reads: 1
  }, {
    modern: 42,
    legacy: 'integrated',
    expected: [true, false],
    reads: 1
  }])('窗口模式$modern/旧$legacy仅需要时读取旧值', async ({
    modern,
    legacy,
    expected,
    reads
  }) => {
    const values: Record<string, unknown> = { 'standalone-window-mode': modern, 'countdown-window-mode': legacy, 'hover-screenshot-mode': 'display' };
    api.storeRead.mockImplementation((key) => Promise.resolve(values[key]));
    api.idleClickExpandGet.mockResolvedValue(true);
    render();
    runEffects();
    await settle();
    expect(checked('standalone-window-mode')).toEqual(expected);
    expect(api.storeRead.mock.calls.filter(([key]) => key === 'countdown-window-mode')).toHaveLength(reads);
    expect(checked('hover-screenshot-mode')).toEqual([false, true]);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([true, true, true]);
  });
  it.each(['notch', 'pill', 'damaged'])('形态初始化%s规范化', async (mode) => {
    api.shapeModeGet.mockResolvedValue(mode);
    render();
    runEffects();
    await settle();
    expect(checked('island-shape-mode')).toEqual(mode === 'pill' ? [false, true] : [true, false]);
  });
  it('读取全部失败保留默认且订阅仍可正常释放', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    api.shapeModeGet.mockRejectedValue(new Error('offline'));
    api.idleClickExpandGet.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(checked('standalone-window-mode')).toEqual([true, false]);
    expect(checked('hover-screenshot-mode')).toEqual([true, false]);
    expect(checked('island-shape-mode')).toEqual([true, false]);
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('旧配置读取拒绝保留集成默认', async () => {
    api.storeRead.mockImplementation((key) => key === 'countdown-window-mode' ? Promise.reject(new Error('offline')) : Promise.resolve(undefined));
    render();
    runEffects();
    await settle();
    expect(checked('standalone-window-mode')).toEqual([true, false]);
  });
  it.each([true, false])('卸载后迟到读取拒绝=%s不写入状态', async (failure) => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    const pending = new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    });
    api.storeRead.mockReturnValue(pending);
    api.shapeModeGet.mockReturnValue(pending as Promise<string>);
    api.idleClickExpandGet.mockReturnValue(pending as Promise<boolean>);
    render();
    runEffects();
    unmountHooks();
    if (failure) reject(new Error('offline'));else resolve('standalone');
    await settle();
    expect(checked('standalone-window-mode')).toEqual([true, false]);
    expect(checked('hover-screenshot-mode')).toEqual([true, false]);
    expect(checked('island-shape-mode')).toEqual([true, false]);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([true, true, false]);
  });
  it('已进入旧配置读取后卸载忽略旧值', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockImplementation((key) => key === 'countdown-window-mode' ? new Promise((done) => {
      resolve = done;
    }) : Promise.resolve(undefined));
    render();
    runEffects();
    await settle();
    unmountHooks();
    resolve('standalone');
    await settle();
    expect(checked('standalone-window-mode')).toEqual([true, false]);
  });
});
describe('真实交互和公共外部事件', () => {
  it.each([true, false])('持久化失败=%s仍更新界面并提示重启', async (failure) => {
    if (failure) {[api.storeWrite, api.settingsPreview, api.shapeModeSet, api.idleClickExpandSet, api.expandMouseleaveIdleSet, api.maxexpandMouseleaveIdleSet].forEach((mock) => {
      mock.mockRejectedValue(new Error('offline'));
    });}
    elements(render()).filter((node) => elementProps(node).type === 'radio').forEach((node) => {
      invoke(node, 'onChange');
    });
    elements(render()).filter((node) => elementProps(node).type === 'checkbox').forEach((node) => {
      invoke(node, 'onChange', {
        target: {
          checked: false
        }
      });
    });
    expect(props.setExpandLeaveIdle).toHaveBeenCalledWith(false);
    expect(props.setMaxExpandLeaveIdle).toHaveBeenCalledWith(false);
    expect(api.expandMouseleaveIdleSet).toHaveBeenCalledWith(false);
    expect(api.maxexpandMouseleaveIdleSet).toHaveBeenCalledWith(false);
    expect(api.idleClickExpandSet).toHaveBeenCalledWith(false);
    expect(api.shapeModeSet.mock.calls.map(([mode]) => mode)).toEqual(['notch', 'pill']);
    expect(api.storeWrite).toHaveBeenCalledWith('standalone-window-mode', 'integrated');
    expect(api.storeWrite).toHaveBeenCalledWith('standalone-window-mode', 'standalone');
    expect(api.storeWrite).toHaveBeenCalledWith('hover-screenshot-mode', 'region');
    expect(api.storeWrite).toHaveBeenCalledWith('hover-screenshot-mode', 'display');
    expect(store.setNotification).toHaveBeenCalledTimes(2);
    expect(api.settingsPreview.mock.calls.map(([channel]) => channel)).toEqual(['notification:show', 'notification:show']);
    expect(checked('island-shape-mode')).toEqual([false, true]);
    expect(checked('standalone-window-mode')).toEqual([false, true]);
    expect(checked('hover-screenshot-mode')).toEqual([false, true]);
    await settle();
  });
  it.each(['notch', 'pill', 'damaged'])('形态外部变更%s更新实际状态，其他频道忽略', async (mode) => {
    render();
    runEffects();
    await settle();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener('island:shape-mode', mode);
    expect(checked('island-shape-mode')).toEqual(mode === 'pill' ? [false, true] : [true, false]);
    listener('unrelated', 'pill');
    expect(checked('island-shape-mode')).toEqual(mode === 'pill' ? [false, true] : [true, false]);
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
