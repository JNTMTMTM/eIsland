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
 * @file useEagerContentLoaderRuntime.test.ts
 * @description 全展开真实动态模块加载、Promise去重、切换卸载与外部依赖加载失败测试
 * @author 鸡哥
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';

vi.doMock('react-i18next', async () => ({ ...await vi.importActual<typeof import('react-i18next')>('react-i18next'), useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
let cache: Map<string, string>;
let loader: typeof import('../../maxExpandContentEagerLoader');
let hook: typeof import('../useEagerContentLoader').useEagerContentLoader;

beforeEach(async () => {
  vi.resetModules(); resetHook(); cache = new Map();
  vi.stubGlobal('Element', class extends EventTarget { matches = () => false; });
  vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) ?? null, setItem: (key: string, value: string) => cache.set(key, value), removeItem: (key: string) => cache.delete(key) });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage, matchMedia: () => Object.assign(new EventTarget(), { matches: false }), location: { hostname: 'localhost' }, api: {
    storeRead: (key: string) => Promise.resolve(key === 'maxexpand-performance-mode-enabled' && cache.get('eIsland:maxexpand-performance-mode-enabled') === 'false' ? false : null), onSettingsChanged: () => () => undefined,
  }, electron: { ipcRenderer: { send: vi.fn(), on: vi.fn(), removeListener: vi.fn() } } }));
  loader = await import('../../maxExpandContentEagerLoader'); hook = (await import('../useEagerContentLoader')).useEagerContentLoader;
});
afterEach(() => { unmountHook(); vi.doUnmock('katex'); vi.unstubAllGlobals(); });

it('skips loading in performance mode and uses the real component after native import completes', async () => {
  expect(renderHook(hook, true)).toBeFalsy(); flushHookEffects(); expect(loader.getLoadedMaxExpandContentEager()).toBe(null);
  renderHook(hook, false); flushHookEffects(); const imported = await loader.loadMaxExpandContentEager(); await settleHook();
  expect(renderHook(hook, false)).toBe(imported.default); flushHookEffects(); expect(loader.getLoadedMaxExpandContentEager()).toBe(imported.default);
}, 60_000);

it('shares actual dynamic import promises and returns preloaded cached component immediately', async () => {
  loader.preloadMaxExpandContentEager(); const first = loader.loadMaxExpandContentEager(); expect(loader.loadMaxExpandContentEager()).toBe(first);
  const imported = await first; expect(renderHook(hook, false)).toBe(imported.default); flushHookEffects();
}, 20_000);

it.each(['unmount', 'performance'])('discards native import completion after %s', async (action) => {
  renderHook(hook, false); flushHookEffects();
  if (action === 'unmount') unmountHook(); else { renderHook(hook, true); flushHookEffects(); }
  await loader.loadMaxExpandContentEager(); await settleHook(); expect(renderHook(hook, true)).toBeFalsy();
}, 20_000);

it('contains a failed external package load while preserving the actual eager loader and import chain', async () => {
  vi.doMock('katex', () => { throw new Error('external package unavailable'); });
  renderHook(hook, false); flushHookEffects(); await expect(loader.loadMaxExpandContentEager()).rejects.toThrow(); await settleHook();
  expect(renderHook(hook, false)).toBeFalsy();
});

it('preloads real eager content from the disabled-performance cache and transitions from Suspense to its component', async () => {
  cache.set('eIsland:maxexpand-performance-mode-enabled','false');
  const { MaxExpandContent } = await import('../../MaxExpandContent');
  const pending = renderHook(MaxExpandContent); expect(pending.type).toBe((await import('react')).Suspense);
  expect(loader.getLoadedMaxExpandContentEager()).toBe(null);
  flushHookEffects();
  const imported = await loader.loadMaxExpandContentEager(); await settleHook();
  expect(renderHook(MaxExpandContent).type).toBe(imported.default);
}, 20_000);

it('changes from cached lazy performance content to loaded eager content through the real setting event', async () => {
  cache.set('eIsland:maxexpand-performance-mode-enabled','true');
  const { MaxExpandContent } = await import('../../MaxExpandContent');
  const { MaxExpandContentLazy } = await import('../../MaxExpandContentLazy');
  expect(renderHook(MaxExpandContent).type).toBe(MaxExpandContentLazy); flushHookEffects(); await settleHook();
  const event = new Event('maxexpand-performance-mode-changed'); Object.defineProperty(event,'detail',{ value:false }); window.dispatchEvent(event);
  expect(renderHook(MaxExpandContent).type).toBe((await import('react')).Suspense); flushHookEffects();
  const imported = await loader.loadMaxExpandContentEager(); await settleHook(); expect(renderHook(MaxExpandContent).type).toBe(imported.default);
  const back = new Event('maxexpand-performance-mode-changed'); Object.defineProperty(back,'detail',{ value:true }); window.dispatchEvent(back);
  expect(renderHook(MaxExpandContent).type).toBe(MaxExpandContentLazy);
}, 20_000);
