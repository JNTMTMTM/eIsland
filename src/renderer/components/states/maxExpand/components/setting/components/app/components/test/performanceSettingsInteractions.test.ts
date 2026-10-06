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
 * @file performanceSettingsInteractions.test.ts
 * @description 性能模式实际缓存接线、外部订阅、取消及帧率设置持久化回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceSettingsPage } from '../PerformanceSettingsPage';
import { elementProps, elements, invoke } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
const store = vi.hoisted(() => ({
  setNotification: vi.fn()
}));
const preload = vi.hoisted(() => vi.fn<() => void>());
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
vi.mock('../../../../../../maxExpandContentEagerLoader', () => ({
  preloadMaxExpandContentEager: preload
}));
const unsubscribe = vi.fn<() => void>();
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  settingsPreview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>()
};
const localStorage = {
  getItem: vi.fn<(key: string) => string | null>(),
  setItem: vi.fn<(key: string, value: string) => void>()
};
const dispatchEvent = vi.fn<(event: CustomEvent<boolean>) => boolean>();
/**
 * 重绘实际性能设置。
 * @returns 实际组件树。
 */
function render() {
  return renderWithHooks(() => PerformanceSettingsPage());
}
/**
 * 获取实际两个性能开关。
 * @returns 当前输入元素。
 */
function inputs() {
  return elements(render()).filter((node) => node.type === 'input');
}
/**
 * 等待真实配置与持久化回调。
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
  localStorage.getItem.mockReturnValue(null);
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  api.settingsPreview.mockResolvedValue(undefined);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', {
    api,
    localStorage,
    dispatchEvent
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实初始化缓存与取消', () => {
  it('初始读取真实本地缓存，随后保存配置覆盖缓存与帧率', async () => {
    localStorage.getItem.mockReturnValue('false');
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([false, false]);
    api.storeRead.mockResolvedValue(true);
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, true]);
    expect(localStorage.setItem).toHaveBeenCalledWith('eIsland:maxexpand-performance-mode-enabled', 'true');
  });
  it.each([true, false, 'damaged'])('保存值%o规范化性能和帧率两个开关', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([value !== false, value === true]);
  });
  it('保存读取拒绝保留初始默认', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, false]);
  });
  it('卸载后迟到配置和外部推送都取消并释放订阅', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    unmountHooks();
    resolve(false);
    listener('store:maxexpand-performance-mode-enabled', false);
    await settle();
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, false]);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it.each([false, true, 'unknown'])('实际配置推送%o更新缓存，其他频道忽略', async (value) => {
    render();
    runEffects();
    await settle();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener('store:maxexpand-performance-mode-enabled', value);
    expect(elementProps(inputs()[0]).checked).toBe(value !== false);
    expect(localStorage.setItem).toHaveBeenLastCalledWith('eIsland:maxexpand-performance-mode-enabled', String(value !== false));
    listener('unrelated', false);
    expect(elementProps(inputs()[0]).checked).toBe(value !== false);
  });
});
describe('真实性能开关接线', () => {
  it.each([true, false])('写入失败=%s仍预加载旧内容并分发模式和重启通知', async (failure) => {
    if (failure) {
      api.storeWrite.mockRejectedValue(new Error('offline'));
      api.settingsPreview.mockRejectedValue(new Error('offline'));
    }
    invoke(inputs()[0], 'onChange', {
      target: {
        checked: false
      }
    });
    expect(preload).toHaveBeenCalledOnce();
    expect(api.storeWrite).toHaveBeenCalledWith('maxexpand-performance-mode-enabled', false);
    expect(api.settingsPreview).toHaveBeenCalledWith('store:maxexpand-performance-mode-enabled', false);
    invoke(inputs()[0], 'onChange', {
      target: {
        checked: true
      }
    });
    expect(preload).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls.map(([event]) => ({
      type: event.type,
      detail: event.detail
    }))).toEqual([{
      type: 'maxexpand-performance-mode-changed',
      detail: false
    }, {
      type: 'maxexpand-performance-mode-changed',
      detail: true
    }]);
    invoke(inputs()[1], 'onChange', {
      target: {
        checked: true
      }
    });
    expect(api.storeWrite).toHaveBeenCalledWith('disable-frame-rate-limit', true);
    expect(store.setNotification).toHaveBeenCalledOnce();
    expect(api.settingsPreview.mock.calls.map(([channel]) => channel)).toEqual(['store:maxexpand-performance-mode-enabled', 'store:maxexpand-performance-mode-enabled', 'notification:show']);
    expect(inputs().map((node) => elementProps(node).checked)).toEqual([true, true]);
    await settle();
  });
});
