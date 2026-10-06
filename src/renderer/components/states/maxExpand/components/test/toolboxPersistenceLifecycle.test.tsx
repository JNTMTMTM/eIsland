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
 * @file toolboxPersistenceLifecycle.test.tsx
 * @description 工具箱真实状态存储与初始化非数组、第二阶段失败及卸载晚返回回归测试。
 * @author 鸡哥
 */
import { createStore, type StateCreator } from 'zustand/vanilla';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elements, text } from '../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, translationProbe, unmountHook } from '../../../../hooks/test/startupHookHarness';
let Component: typeof import('../ToolboxTab').ToolboxTab;
const read = vi.fn<(key: string) => Promise<unknown>>();
const write = vi.fn<(key: string, value: unknown) => Promise<boolean>>();
/** 读取真实可见导航卡片。
 * @returns 卡片文字
 */
function cards() {
  return elements(renderHook(Component)).filter((n) => n.props.className === 'settings-index-card').map(text);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  read.mockResolvedValue(null);
  write.mockResolvedValue(true);
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    }
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage,
    location: {
      hostname: 'electron.invalid'
    },
    api: {
      storeRead: read,
      storeWrite: write
    }
  }));
  vi.doMock('react', async (original) => ({
    ...createHookReactMock(await original<typeof import('react')>()),
    useSyncExternalStore: (...[, getSnapshot]: [unknown, () => unknown]) => getSnapshot(),
    useDebugValue: () => {}
  }));
  // Node 无 DOM，使用真实 Zustand vanilla 状态，隔离其外部 React 订阅适配器。
  vi.doMock('zustand', () => ({
    create: <T,>() => (creator: StateCreator<T>) => {
      const store = createStore<T>()(creator);
      return Object.assign(() => store.getState(), store);
    }
  }));
  vi.doMock('react-i18next', async (original) => ({
    ...(await original<typeof import('react-i18next')>()),
    useTranslation: () => ({
      t: translationProbe,
      i18n: {
        language: 'zh-CN'
      }
    })
  }));
  ({
    ToolboxTab: Component
  } = await import('../ToolboxTab'));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('toolbox native persistence lifecycle', () => {
  it.each([null, {
    corrupt: true
  }, []])('invalid or empty stored visible order uses all default cards: %j', async (visible) => {
    read.mockResolvedValueOnce(visible).mockResolvedValueOnce({
      corrupt: true
    });
    renderHook(Component);
    flushHookEffects();
    await settleHook();
    expect(read).toHaveBeenNthCalledWith(1, 'toolbox-nav-order');
    expect(read).toHaveBeenNthCalledWith(2, 'toolbox-hidden-nav-order');
    expect(cards()).toHaveLength(12);
    expect(cards()[0]).toContain('download-create');
  });
  it('hidden-order rejection consumes failure without applying a partially loaded visible order', async () => {
    read.mockResolvedValueOnce(['software']).mockRejectedValueOnce(new Error('store denied'));
    renderHook(Component);
    flushHookEffects();
    await settleHook();
    expect(read).toHaveBeenCalledTimes(2);
    expect(cards()[0]).toContain('download-create');
    expect(cards()).toHaveLength(12);
  });
  it('unmount during the second read prevents late values from replacing default cards', async () => {
    const hidden = deferred<unknown>();
    read.mockResolvedValueOnce(['software']).mockReturnValueOnce(hidden.promise);
    renderHook(Component);
    flushHookEffects();
    await settleHook();
    expect(read).toHaveBeenCalledTimes(2);
    unmountHook();
    hidden.resolve([]);
    await settleHook();
    expect(cards()[0]).toContain('download-create');
  });
});
