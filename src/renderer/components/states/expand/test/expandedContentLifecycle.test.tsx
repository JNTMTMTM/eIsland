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
 * @file expandedContentLifecycle.test.tsx
 * @description 展开组件连接真实 Zustand、设置 Hook、启动 Promise 与活动上下文生命周期测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  byClass, elements, invoke
} from '../../test/tree';
import {
  lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';
import type {
  ReactElement
} from 'react';
const context = vi.hoisted(() => ({
  active: true
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../test/elementHarness')).hookMocks,
  ...(await import('../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks,
  useContext: () => context.active,
}));
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()), useTranslation: () => ({
    t: (key: string) => key, i18n: {
      language: 'en-US'
    }
  })
}));
const storeRead = vi.fn<Window['api']['storeRead']>();
const storeWrite = vi.fn<Window['api']['storeWrite']>();
const onSettingsChanged = vi.fn<Window['api']['onSettingsChanged']>();
let Component: typeof import('../ExpandedContent').ExpandedContent;
let store: typeof import('../../../../store/slices').default;
let resolveMode: (value: unknown) => void;
/** 读取实际 Zustand 外部快照。
 * @param subscribe - React订阅入口。
 * @param getSnapshot - 实际快照读取入口。
 * @returns 当前状态。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}
/** 执行真实组件及所有展开设置 Hook。
 * @returns 当前元素树。
 */
function view(): ReactElement {
  return renderWithHooks(Component);
}
/** 提交实际设置初始化与 Promise 回调。
 * @returns 最新元素树。
 */
async function commit() {
  view();
  runEffects();
  await Array.from({
    length: 15
  }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  return view();
}
/** 通过实际导航元素进入最大展开。
 * @param root - 实际组件树。
 */
function openMax(root: ReactElement): void {
  invoke(elements(root).find((node) => String(node.key).endsWith('maxExpand'))!, 'onClick');
}
beforeEach(async () => {
  vi.resetModules();
  resetLifecycle();
  vi.clearAllMocks();
  context.active = true;
  const pending = new Promise<unknown>((resolve) => {
    resolveMode = resolve;
  });
  storeRead.mockImplementation((key) => key === 'standalone-window-mode' ? pending : Promise.resolve(key === 'maxexpand-performance-mode-enabled' ? true : undefined));
  storeWrite.mockResolvedValue(true);
  onSettingsChanged.mockReturnValue(() => undefined);
  const localStorage = {
    getItem: () => null, setItem: () => undefined
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage, location: {
      hostname: 'app'
    }, api: {
      storeRead, storeWrite, onSettingsChanged, expandWindowSettings: vi.fn(), disableMousePassthrough: vi.fn()
    }
  }));
  const react = await vi.importActual<typeof import('react') & {
    default: typeof import('react')
  }>('react');
  vi.spyOn(react.default, 'useRef').mockImplementation((initial) => lifecycleHooks.useRef(initial));
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  ({
    ExpandedContent: Component
  } = await import('../ExpandedContent'));
  ({
    default: store
  } = await import('../../../../store/slices'));
  store.setState({
    state: 'expanded', expandTab: 'overview', maxExpandTab: 'settings', uiStateLocked: false, maxExpandAppModeEnabled: false
  });
}, 60_000);
afterEach(() => {
  unmountHooks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('展开组件真实配置、状态与启动生命周期', () => {
  it('启动解析未完成时先展示集成导航，真实 settings 活动页进入最大展开保持选择', async () => {
    const root = await commit();
    expect(byClass(root, 'expanded-content')).toBeDefined();
    resolveMode('integrated');
    await commit();
    openMax(view());
    expect(store.getState()).toMatchObject({
      state: 'maxExpand', maxExpandTab: 'settings'
    });
  });
  it('待启动模式解析时卸载，迟到 standalone 回调不再改变真实元素导航', async () => {
    await commit();
    unmountHooks();
    resolveMode('standalone');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getState().state).toBe('expanded');
  });
  it('离场 render 后 passive effect 清理前的原生 wheel 不能进入最大展开', async () => {
    const host = Object.assign(new EventTarget(), {
      closest: () => null
    });
    const root = view();
    const ref = byClass(root, 'expanded-content').props.ref as {
      current: unknown
    };
    ref.current = host;
    await commit();
    resolveMode('integrated');
    await commit();
    store.setState({
      expandTab: 'performanceMonitor'
    });
    view();
    context.active = false;
    view();
    const before = store.getState();
    host.dispatchEvent(Object.assign(new Event('wheel', {
      cancelable: true
    }), {
      deltaY: 1
    }));
    expect(store.getState()).toBe(before);
    runEffects();
    const after = new Event('wheel', {
      cancelable: true
    });
    host.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
  it('父 Activity 上下文非活动时停止页校正并拒绝实际导航点击', async () => {
    context.active = false;
    await commit();
    resolveMode('integrated');
    await commit();
    const before = store.getState();
    elements(view()).filter((node) => node.type === 'button').forEach((node) => invoke(node, 'onClick'));
    expect(store.getState()).toBe(before);
  });
});
