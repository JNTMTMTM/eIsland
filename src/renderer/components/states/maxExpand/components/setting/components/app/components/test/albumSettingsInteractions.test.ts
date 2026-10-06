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
 * @file albumSettingsInteractions.test.ts
 * @description 相册设置真实配置规范化、外部更新、取消与全部控件持久化回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumSettingsPage } from '../AlbumSettingsPage';
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
const unsubscribe = vi.fn<() => void>();
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>()
};
/**
 * 重绘真实相册设置。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => AlbumSettingsPage());
}
/**
 * 等待真实读取与写入失败回调。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 收集实际单选组的选择。
 * @param name - 输入分组名称。
 * @returns 实际页面顺序中的选中值。
 */
function checked(name: string) {
  return elements(render()).filter((node) => elementProps(node).name === name).map((node) => elementProps(node).checked);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('相册真实配置规范化', () => {
  it.each([null, undefined, 42, {
    intervalMs: 42,
    orderMode: 'damaged',
    mediaFilter: 'unknown',
    clickBehavior: 'unknown'
  }])('保存配置%o使用默认', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(checked('album-interval')).toEqual([false, true, false]);
    expect(checked('album-order-mode')).toEqual([true, false]);
    expect(checked('album-media-filter')).toEqual([true, false, false]);
    expect(checked('album-click-behavior')).toEqual([true, false]);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([true, true, true]);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it.each([{
    intervalMs: 3000,
    mediaFilter: 'image',
    interval: [true, false, false],
    filter: [false, true, false]
  }, {
    intervalMs: 5000,
    mediaFilter: 'video',
    interval: [false, true, false],
    filter: [false, false, true]
  }, {
    intervalMs: 8000,
    mediaFilter: 'all',
    interval: [false, false, true],
    filter: [true, false, false]
  }])('$intervalMs/$mediaFilter读取配置使用合法值', async ({
    intervalMs,
    mediaFilter,
    interval,
    filter
  }) => {
    api.storeRead.mockResolvedValue({
      intervalMs,
      mediaFilter,
      orderMode: 'random',
      clickBehavior: 'none',
      autoRotate: false,
      videoAutoPlay: false,
      videoMuted: false
    });
    render();
    runEffects();
    await settle();
    expect(checked('album-interval')).toEqual(interval);
    expect(checked('album-media-filter')).toEqual(filter);
    expect(checked('album-order-mode')).toEqual([false, true]);
    expect(checked('album-click-behavior')).toEqual([false, true]);
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([false, false, false]);
  });
  it('读取失败保留默认配置且公共订阅仍注册', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(checked('album-interval')).toEqual([false, true, false]);
    expect(api.onSettingsChanged).toHaveBeenCalledOnce();
  });
  it.each([true, false])('卸载后迟到读取拒绝=%s不改变默认并释放订阅', async (failure) => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    }));
    render();
    runEffects();
    unmountHooks();
    if (failure) reject(new Error('offline'));else {resolve({
      intervalMs: 3000
    });}
    await settle();
    expect(checked('album-interval')).toEqual([false, true, false]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('真实外部配置事件更新规范化，非目标频道与卸载后事件忽略', async () => {
    render();
    runEffects();
    await settle();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener('unrelated', {
      intervalMs: 3000
    });
    expect(checked('album-interval')).toEqual([false, true, false]);
    listener('store:overview-album-config', {
      intervalMs: 3000,
      mediaFilter: 'image'
    });
    expect(checked('album-interval')).toEqual([true, false, false]);
    expect(checked('album-media-filter')).toEqual([false, true, false]);
    unmountHooks();
    listener('store:overview-album-config', {
      intervalMs: 8000
    });
    expect(checked('album-interval')).toEqual([true, false, false]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
describe('实际全部控件提交', () => {
  it.each([true, false])('持久化失败=%s时函数式状态更新保留此前配置', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
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
    expect(api.storeWrite).toHaveBeenLastCalledWith('overview-album-config', {
      intervalMs: 8000,
      autoRotate: false,
      orderMode: 'random',
      mediaFilter: 'video',
      clickBehavior: 'none',
      videoAutoPlay: false,
      videoMuted: false
    });
    expect(api.storeWrite).toHaveBeenCalledTimes(13);
    expect(checked('album-interval')).toEqual([false, false, true]);
    expect(checked('album-order-mode')).toEqual([false, true]);
    expect(checked('album-media-filter')).toEqual([false, false, true]);
    expect(checked('album-click-behavior')).toEqual([false, true]);
    await settle();
  });
});
