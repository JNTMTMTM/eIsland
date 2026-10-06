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
 * @file useExpandSettingsRuntime.test.ts
 * @description 真实导航配置规范化、预加载、性能缓存、动画及设置监听生命周期测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { DEFAULT_EXPAND_NAV_LAYOUT, DEFAULT_MAXEXPAND_NAV_LAYOUT, EXPAND_NAV_LAYOUT_STORE_KEY, MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../../maxExpand/components/setting/utils/settingsConfig';
import { MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY, MAXEXPAND_PERFORMANCE_MODE_STORE_KEY } from '../../../maxExpand/components/setting/utils/performanceSettings';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
// 只隔离懒加载页面叶组件；加载器的 Promise、缓存与预加载代码保持真实。
vi.mock('../../../maxExpand/MaxExpandContentEager', () => ({
  MaxExpandContentEager: () => createElement('div', {
    'data-eager': true
  })
}));
let nav: typeof import('../useExpandNavLayout');
let animation: typeof import('../useExpandTabAnimation');
let loader: typeof import('../../../maxExpand/maxExpandContentEagerLoader');
let browser: EventTarget;
const storage = new Map<string, string>();
const read = vi.fn<(key: string) => Promise<unknown>>();
const listeners: Array<(channel: string, value: unknown) => void> = [];
const offs: Array<ReturnType<typeof vi.fn<() => void>>> = [];
/** 提交真实导航效果。
 * @returns 当前导航状态
 */
async function mountNav() {
  renderHook(nav.useExpandNavLayout);
  flushHookEffects();
  await settleHook();
  return renderHook(nav.useExpandNavLayout);
}
/** 执行原生设置广播。
 * @param channel - 设置键
 * @param value - 载荷
 */
function broadcast(channel: string, value: unknown): void {
  listeners.forEach((listener) => listener(channel, value));
}
/** 从实际原生事件分发到真实布局处理器。
 * @param type - 事件类型
 * @param detail - 配置
 */
function emit(type: string, detail: unknown): void {
  const event = new Event(type);
  Object.defineProperty(event, 'detail', {
    value: detail
  });
  browser.dispatchEvent(event);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  listeners.length = 0;
  offs.length = 0;
  storage.clear();
  browser = new EventTarget();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value)
  };
  vi.stubGlobal('window', Object.assign(browser, {
    localStorage,
    api: {
      storeRead: read,
      onSettingsChanged: (callback: (channel: string, value: unknown) => void) => {
        listeners.push(callback);
        const off = vi.fn<() => void>();
        offs.push(off);
        return off;
      }
    }
  }));
  read.mockResolvedValue(undefined);
  nav = await import('../useExpandNavLayout');
  animation = await import('../useExpandTabAnimation');
  loader = await import('../../../maxExpand/maxExpandContentEagerLoader');
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('expand actual layout cache and settings lifecycle', () => {
  it('default caches enable performance, do not load eager page and preserve normalized layouts', async () => {
    const state = await mountNav();
    expect(state).toMatchObject({
      navLayoutConfig: DEFAULT_EXPAND_NAV_LAYOUT,
      maxExpandNavLayoutConfig: DEFAULT_MAXEXPAND_NAV_LAYOUT,
      maxExpandPerformanceModeEnabled: true
    });
    state.preloadEagerWhenPerformanceModeDisabled();
    expect(loader.getLoadedMaxExpandContentEager()).toBeNull();
    expect(storage.get(MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY)).toBe('true');
  });
  it.each(['cache', 'read', 'broadcast'] as const)('disabled performance by %s loads through real eager loader and public callback', async (origin) => {
    if (origin === 'cache') storage.set(MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY, 'false');
    if (origin === 'read') read.mockImplementation((key) => Promise.resolve(key === MAXEXPAND_PERFORMANCE_MODE_STORE_KEY ? false : undefined));
    const state = await mountNav();
    if (origin === 'broadcast') broadcast(`store:${  MAXEXPAND_PERFORMANCE_MODE_STORE_KEY}`, false);
    renderHook(nav.useExpandNavLayout).preloadEagerWhenPerformanceModeDisabled();
    await loader.loadMaxExpandContentEager();
    expect(loader.getLoadedMaxExpandContentEager()).toBeTypeOf('function');
    expect((await loader.loadMaxExpandContentEager()).default).toBe(loader.getLoadedMaxExpandContentEager());
    expect(state.navLayoutConfig).toEqual(DEFAULT_EXPAND_NAV_LAYOUT);
    broadcast(`store:${  MAXEXPAND_PERFORMANCE_MODE_STORE_KEY}`, true);
    expect(renderHook(nav.useExpandNavLayout).maxExpandPerformanceModeEnabled).toBe(true);
  });
  it('native read, IPC broadcasts and local events normalize actual known layout IDs', async () => {
    read.mockImplementation((key) => Promise.resolve(key === EXPAND_NAV_LAYOUT_STORE_KEY ? [{
      id: 'song',
      visible: false
    }] : [{
      id: 'todo',
      visible: false
    }]));
    await mountNav();
    expect(renderHook(nav.useExpandNavLayout).navLayoutConfig[0]).toEqual({
      id: 'song',
      visible: false
    });
    expect(renderHook(nav.useExpandNavLayout).maxExpandNavLayoutConfig[0]).toEqual({
      id: 'todo',
      visible: false
    });
    broadcast('unrelated', false);
    broadcast(`store:${  EXPAND_NAV_LAYOUT_STORE_KEY}`, [{
      id: 'tools',
      visible: false
    }]);
    broadcast(`store:${  MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, [{
      id: 'album',
      visible: false
    }]);
    expect(renderHook(nav.useExpandNavLayout).navLayoutConfig[0].id).toBe('tools');
    expect(renderHook(nav.useExpandNavLayout).maxExpandNavLayoutConfig[0].id).toBe('album');
    emit('expand-nav-layout-changed', [{
      id: 'overview',
      visible: false
    }]);
    emit('maxexpand-nav-layout-changed', [{
      id: 'memo',
      visible: false
    }]);
    expect(renderHook(nav.useExpandNavLayout).navLayoutConfig[0]).toEqual({
      id: 'overview',
      visible: true
    });
    expect(renderHook(nav.useExpandNavLayout).maxExpandNavLayoutConfig[0]).toEqual({
      id: 'memo',
      visible: false
    });
    unmountHook();
    expect(offs).toHaveLength(3);
    offs.forEach((off) => expect(off).toHaveBeenCalledOnce());
    emit('expand-nav-layout-changed', [{
      id: 'song'
    }]);
    emit('maxexpand-nav-layout-changed', [{
      id: 'stock'
    }]);
    expect(renderHook(nav.useExpandNavLayout).navLayoutConfig[0].id).toBe('overview');
  });
  it('read rejections are consumed and pending read/queued IPC responses cannot change disposed state', async () => {
    read.mockRejectedValue(new Error('bridge'));
    expect((await mountNav()).navLayoutConfig).toEqual(DEFAULT_EXPAND_NAV_LAYOUT);
    unmountHook();
    resetHook();
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(nav.useExpandNavLayout);
    flushHookEffects();
    unmountHook();
    pending.resolve(false);
    broadcast(`store:${  EXPAND_NAV_LAYOUT_STORE_KEY}`, [{
      id: 'song'
    }]);
    broadcast(`store:${  MAXEXPAND_NAV_LAYOUT_STORE_KEY}`, [{
      id: 'memo'
    }]);
    broadcast(`store:${  MAXEXPAND_PERFORMANCE_MODE_STORE_KEY}`, false);
    await settleHook();
    expect(renderHook(nav.useExpandNavLayout)).toMatchObject({
      navLayoutConfig: DEFAULT_EXPAND_NAV_LAYOUT,
      maxExpandNavLayoutConfig: DEFAULT_MAXEXPAND_NAV_LAYOUT,
      maxExpandPerformanceModeEnabled: true
    });
  });
  it.each([false, true, null])('native animation setting %s applies false only and exact settings channel', async (value) => {
    read.mockResolvedValue(value);
    renderHook(animation.useExpandTabAnimation);
    flushHookEffects();
    await settleHook();
    expect(renderHook(animation.useExpandTabAnimation)).toBe(value !== false);
    broadcast('unrelated', false);
    broadcast('settings:expand-tab-animation', false);
    expect(renderHook(animation.useExpandTabAnimation)).toBe(false);
    broadcast('settings:expand-tab-animation', undefined);
    expect(renderHook(animation.useExpandTabAnimation)).toBe(true);
    unmountHook();
    broadcast('settings:expand-tab-animation', false);
    expect(renderHook(animation.useExpandTabAnimation)).toBe(true);
    expect(offs[0]).toHaveBeenCalledOnce();
  });
  it('animation read rejection and late read after cleanup preserve default', async () => {
    read.mockRejectedValue(new Error('bridge'));
    renderHook(animation.useExpandTabAnimation);
    flushHookEffects();
    await settleHook();
    expect(renderHook(animation.useExpandTabAnimation)).toBe(true);
    unmountHook();
    resetHook();
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(animation.useExpandTabAnimation);
    flushHookEffects();
    unmountHook();
    pending.resolve(false);
    await settleHook();
    expect(renderHook(animation.useExpandTabAnimation)).toBe(true);
  });
});
