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
 * @file overviewTabLifecycle.test.tsx
 * @description 总览真实 Zustand、控件导航、待办回写、存储同步和卸载竞态集成测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  OverviewTab
} from '../OverviewTab';
import {
  TodoWidget, ShortcutsWidget, WorldClockWidget, AlbumCarouselWidget
} from '../OverviewTab/components/OverviewWidgets';
import useIslandStore from '../../../../../store/slices';
import {
  elements, find, invoke, text, byClass
} from '../../../test/tree';
import {
  lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';

const translate = vi.hoisted(() => {
  const localStorage = {
    getItem: () => null, setItem: () => undefined
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage, api: {
    }, location: {
      hostname: 'app'
    }
  }));
  return vi.fn<(key: string) => string>((key) => key);
});
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()), useTranslation: () => ({
    t: translate, i18n: {
      language: 'en-US'
    }
  })
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(), storeWrite: vi.fn<Window['api']['storeWrite']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(), openStandaloneWindow: vi.fn<Window['api']['openStandaloneWindow']>(),
  openFile: vi.fn<Window['api']['openFile']>(), expandWindowSettings: vi.fn<Window['api']['expandWindowSettings']>(), disableMousePassthrough: vi.fn<Window['api']['disableMousePassthrough']>()
};
const values = new Map<string, unknown>();
const listeners: Array<(channel: string, value: unknown) => void> = [];
const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();
const unsubscribe = vi.fn<() => void>();

/**
 * 读取真实外部 store 快照。
 * @param subscribe - React 订阅入口。
 * @param getSnapshot - Zustand 当前快照。
 * @returns 真实状态。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}
/**
 * 渲染真实总览组件。
 * @returns 当前元素树。
 */
function view() {
  return renderWithHooks(OverviewTab);
}
/**
 * 提交真实 IPC 加载、订阅与时钟 effect。
 * @returns 更新后的元素树。
 */
async function commit() {
  view();
  runEffects();
  await Array.from({
    length: 12
  }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  return view();
}
/**
 * 通过真实设置广播更新布局或待办。
 * @param key - 存储键。
 * @param value - 广播内容。
 */
function notify(key: string, value: unknown): void {
  listeners.forEach((listener) => listener(`store:${key}`, value));
}
/**
 * 创建原生请求完成入口。
 * @returns 请求及完成操作。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return {
    promise, resolve, reject
  };
}
beforeEach(async () => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  const react = await vi.importActual<typeof import('react') & {
    default: typeof import('react')
  }>('react');
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  values.clear();
  listeners.length = 0;
  values.set('overview-layout', {
    left: 'shortcuts', right: 'todo'
  });
  values.set('app-shortcuts', [{
    id: 1, name: 'First', path: 'one.exe', iconBase64: null
  }, {
    id: 2, name: 'Second', path: 'two.exe', iconBase64: 'icon'
  }]);
  values.set('todos', [{
    id: 1, text: 'Task', done: false, createdAt: 1, subTodos: [{
      id: 11, text: 'One', done: false
    }, {
      id: 12, text: 'Two', done: false
    }]
  }, {
    id: 2, text: 'Other', done: false, createdAt: 1
  }]);
  values.set('standalone-window-mode', 'integrated');
  api.storeRead.mockImplementation((key) => Promise.resolve(values.get(key)));
  api.storeWrite.mockResolvedValue(true);
  api.openStandaloneWindow.mockResolvedValue(true);
  api.openFile.mockResolvedValue(true);
  api.onSettingsChanged.mockImplementation((listener) => {
    listeners.push(listener);
    return unsubscribe;
  });
  getItem.mockReturnValue(null);
  setItem.mockImplementation(() => undefined);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    api
  }));
  vi.stubGlobal('localStorage', {
    getItem, setItem
  });
  useIslandStore.setState({
    state: 'expanded', maxExpandTab: 'memo', uiStateLocked: false
  });
});
afterEach(() => {
  unmountHooks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('OverviewTab 真实状态与控件集成', () => {
  it('实际时钟更新及真实子组件回调编辑并持久化待办', async () => {
    let root = await commit();
    const firstTime = text(byClass(root, 'ov-dash-clock'));
    vi.advanceTimersByTime(1000);
    expect(text(byClass(view(), 'ov-dash-clock'))).not.toBe(firstTime);
    let todo = find(root, (node) => node.type === TodoWidget);
    invoke(todo, 'onToggleExpand', 1);
    expect(find(view(), (node) => node.type === TodoWidget).props.expandedId).toBe(1);
    invoke(find(view(), (node) => node.type === TodoWidget), 'onToggleExpand', 1);
    expect(find(view(), (node) => node.type === TodoWidget).props.expandedId).toBeNull();
    invoke(todo, 'onToggleDone', 1);
    invoke(todo, 'onToggleSubDone', 1, 11);
    invoke(todo, 'onToggleSubDone', 2, 1);
    expect(api.storeWrite).toHaveBeenLastCalledWith('todos', expect.arrayContaining([expect.objectContaining({
      id: 1, done: true, subTodos: [expect.objectContaining({
        id: 11, done: true
      }), expect.objectContaining({
        id: 12, done: false
      })]
    })]));
    setItem.mockImplementation(() => {
      throw new Error('denied');
    });
    api.storeWrite.mockRejectedValue(new Error('readonly'));
    invoke(todo, 'onToggleDone', 2);
    invoke(todo, 'onToggleSubDone', 1, 12);
    invoke(find(view(), (node) => node.type === TodoWidget), 'onToggleExpand', 1);
    invoke(find(view(), (node) => node.type === TodoWidget), 'onRemoveTodo', 1);
    root = await commit();
    todo = find(root, (node) => node.type === TodoWidget);
    expect(todo.props.expandedId).toBeNull();
    const props = todo.props as unknown as Parameters<typeof TodoWidget>[0];
    expect(text(TodoWidget(props))).toContain('Other');
    expect(text(TodoWidget(props))).not.toContain('Task');
    invoke(todo, 'onRemoveTodo', 99);
  });
  it('正规化广播并忽略非数组快照与卸载后的通知', async () => {
    values.set('app-shortcuts', null);
    await commit();
    notify('unrelated', []);
    notify('todos', null);
    expect(find(view(), (node) => node.type === TodoWidget).props.todos).toHaveLength(2);
    notify('todos', []);
    notify('overview-layout', {
      left: 'worldClock', right: 'album', clockStyle: 'minimal'
    });
    expect(text(byClass(view(), 'ov-dash-clock'))).toMatch(/^\d{2}:\d{2}$/);
    expect(elements(view()).some((node) => node.type === WorldClockWidget)).toBe(true);
    unmountHooks();
    notify('overview-layout', null);
    notify('todos', [1]);
    expect(elements(view()).some((node) => node.type === WorldClockWidget)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['success', 'failure'])('卸载后忽略未完成初始化的 %s 回调', async (completion) => {
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValue(pending.promise);
    await commit();
    unmountHooks();
    if (completion === 'success') pending.resolve([]);
    else pending.reject(new Error('late'));
    getItem.mockReturnValue(null);
    await Promise.resolve();
    await Promise.resolve();
    expect(find(view(), (node) => node.type === TodoWidget).props.todos).toEqual([]);
    expect(find(view(), (node) => node.type === ShortcutsWidget).props.apps).toEqual([]);
  });
  it.each(['empty', 'reject', 'malformed', 'denied'])('旧待办缓存 %s 场景使用实际回退路径', async (mode) => {
    values.set('todos', []);
    if (mode === 'reject') api.storeRead.mockImplementation((key) => key === 'todos' ? Promise.reject(new Error('offline')) : Promise.resolve(values.get(key)));
    getItem.mockReturnValue(mode === 'malformed' ? '{' : '[{"id":5,"text":"Legacy","done":false,"createdAt":1}]');
    if (mode === 'denied') {getItem.mockImplementation(() => {
      throw new Error('denied');
    });}
    const root = await commit();
    const child = find(root, (node) => node.type === TodoWidget);
    expect(child.props.todos).toHaveLength(mode === 'malformed' || mode === 'denied' ? 0 : 1);
  });
  it.each(['empty', 'reject'])('只读重现旧待办非数组缓存在 %s 路径破坏真实子组件', async (mode) => {
    values.set('todos', []);
    if (mode === 'reject') {
      api.storeRead.mockImplementation((key) => key === 'todos' ? Promise.reject(new Error('offline')) : Promise.resolve(values.get(key)));
    }
    getItem.mockReturnValue('{}');
    const root = await commit();
    const child = find(root, (node) => node.type === TodoWidget);
    const props = child.props as unknown as Parameters<typeof TodoWidget>[0];
    expect(props.todos).toEqual({
    });
    expect(() => TodoWidget(props)).toThrow(TypeError);
  });
  it('快捷方式实际拖拽排序并处理打开失败', async () => {
    await commit();
    const props = find(view(), (node) => node.type === ShortcutsWidget).props as unknown as Parameters<typeof ShortcutsWidget>[0];
    const event = {
      preventDefault: vi.fn(), dataTransfer: {
        effectAllowed: '', dropEffect: ''
      }
    };
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDrop', event, 0);
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDragStart', event, 0);
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDrop', event, 0);
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDragOver', event, 1);
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDrop', event, 1);
    expect(api.storeWrite).toHaveBeenLastCalledWith('app-shortcuts', [props.apps[1], props.apps[0]]);
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onDragEnd');
    api.openFile.mockRejectedValueOnce(new Error('missing'));
    invoke(find(view(), (node) => node.type === ShortcutsWidget), 'onOpenApp', 'one.exe');
    await commit();
    expect(api.openFile).toHaveBeenCalledWith('one.exe');
  });
  it.each(['legacy-standalone', 'legacy-error', 'initial-error', 'standalone-open-error'])('子组件导航经过实际 store 动作及原生模式 %s', async (mode) => {
    values.set('overview-layout', {
      left: 'worldClock', right: 'album'
    });
    values.set('standalone-window-mode', mode === 'standalone-open-error' ? 'standalone' : null);
    values.set('countdown-window-mode', 'standalone');
    if (mode === 'legacy-error' || mode === 'initial-error') api.storeRead.mockImplementation((key) => key === (mode === 'legacy-error' ? 'countdown-window-mode' : 'standalone-window-mode') ? Promise.reject(new Error('mode error')) : Promise.resolve(values.get(key)));
    if (mode === 'standalone-open-error') api.openStandaloneWindow.mockRejectedValueOnce(new Error('open failed'));
    let root = await commit();
    invoke(find(root, (node) => node.type === AlbumCarouselWidget), 'openAlbumPage');
    await commit();
    if (mode === 'legacy-standalone') expect(api.openStandaloneWindow).toHaveBeenCalledOnce();
    else {expect(useIslandStore.getState()).toMatchObject({
      state: 'maxExpand', maxExpandTab: 'album'
    });}
    root = view();
    invoke(find(root, (node) => node.type === WorldClockWidget), 'onOpenWorldClockPage');
    expect(useIslandStore.getState()).toMatchObject({
      state: 'maxExpand', maxExpandTab: 'worldClock'
    });
  });
});
