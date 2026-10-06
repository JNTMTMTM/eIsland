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
 * @file countdownTabRuntime.test.tsx
 * @description 倒数日页面与真实共享存储、草稿和日期 Hook 联合运行，覆盖筛选、编辑、持久化、撤销与媒体异步边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text, type TreeElement } from '../../../../../test/tree';
import type { StateCreator } from 'zustand';
import type { ReactElement } from 'react';
import type { CountdownItem, CountdownDraft } from '../../types/countdownTypes';
const leaves = vi.hoisted(() => ({
  cover: null as string | null | undefined
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (state: {
    coverImage: string | null | undefined;
  }) => unknown) => selector({
    coverImage: leaves.cover
  })
}));
vi.mock('zustand', async (original) => {
  const actual = await original<typeof import('zustand')>();
  return {
    ...actual,
    create: <State,>(initializer: StateCreator<State>) => {
      const store = actual.create(initializer);
      return Object.assign(() => store.getState(), store);
    }
  };
});
let Component: typeof import('../CountdownTab').CountdownTab;
let disk: CountdownItem[];
let onChanged: ((channel: string, data: unknown) => void) | undefined;
let focused: (() => void) | undefined;
let visibility: (() => void) | undefined;
let api: ReturnType<typeof bridge>;
let nativeWindow: ReturnType<typeof browser>;
let nativeDocument: {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
/** 创建有效事件。
 * @param id - 标识
 * @param name - 名称
 * @param date - 日期
 * @param extras - 特性
 * @returns 存储事件
 */
function item(id: number, name: string, date: string, extras: Partial<CountdownItem> = {}): CountdownItem {
  return {
    id,
    name,
    date,
    color: '#69c0ff',
    type: 'countdown',
    ...extras
  };
}
/** 创建持久化叶接口，保留真实共享 Hook 的 CAS 更新算法。
 * @returns 原生存储叶接口
 */
function bridge() {
  return {
    storeRead: vi.fn(() => Promise.resolve(disk)),
    storeCompareAndSwap: vi.fn<(key: string, expected: unknown, next: unknown) => Promise<'updated' | 'conflict' | 'error'>>((...[,, next]) => {
      disk = next as CountdownItem[];
      return Promise.resolve('updated');
    }),
    onSettingsChanged: vi.fn((callback: (channel: string, data: unknown) => void) => {
      onChanged = callback;
      return vi.fn();
    }),
    loadWallpaperFile: vi.fn<(source: string) => Promise<string | null>>(() => Promise.resolve('data:image/png;base64,cover'))
  };
}
/** 创建浏览器叶事件并使用 Vitest 原生假定时器。
 * @returns 浏览器叶实现
 */
function browser() {
  return {
    api,
    setInterval,
    clearInterval,
    addEventListener: vi.fn((...[, callback]: [string, () => void]) => {
      focused = callback;
    }),
    removeEventListener: vi.fn()
  };
}
/** 读取真实页面。
 * @returns 组件真实返回值
 */
function run(): ReactElement {
  return renderHook(Component);
}
/** 完成真实 Hook 的异步初始化。
 * @returns 初始加载后的页面
 */
async function mount(): Promise<ReactElement> {
  run();
  flushHookEffects();
  await settleHook();
  const tree = run();
  flushHookEffects();
  return tree;
}
/** 查找真实子组件边界。
 * @param tree - 页面
 * @param name - 子组件名
 * @returns 未替换的真实子组件节点
 */
function child(tree: ReactElement, name: string): TreeElement {
  return find(tree, (node) => typeof node.type === 'function' && node.type.name === name);
}
/** 取得真实筛选结果。
 * @param tree - 页面
 * @returns 展示条目
 */
function visible(tree = run()): CountdownItem[] {
  return child(tree, 'CountdownCardList').props.items as CountdownItem[];
}
/** 改变实际 select。
 * @param label - aria 标签
 * @param value - 选项
 */
function choose(label: string, value: string): void {
  invoke(find(run(), (node) => node.type === 'select' && node.props['aria-label'] === label), 'onChange', {
    target: {
      value
    }
  });
}
/** 触发实际筛选按钮。
 * @param filter - 类别
 */
function filter(filter: string): void {
  invoke(find(run(), (node) => node.type === 'button' && text(node) === `countdown.manage.${  filter}`), 'onClick');
}
/** 更新真实草稿。
 * @param patch - 草稿更新
 */
function draft(patch: Partial<CountdownDraft>): void {
  invoke(child(run(), 'CountdownForm'), 'setDraft', (current: CountdownDraft) => ({
    ...current,
    ...patch
  }));
}
/** 调用实际删除按钮。
 * @param target - 删除条目
 */
async function remove(target: CountdownItem): Promise<void> {
  invoke(child(run(), 'CountdownCardList'), 'onDelete', target);
  await settleHook();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  leaves.cover = null;
  disk = [item(1, 'Alpha', '2030-01-01'), item(2, 'Beta', '2028-01-01', {
    pinned: true,
    description: 'Special event',
    type: 'birthday'
  }), item(3, 'Gamma', '2027-01-01'), item(4, 'Archive', '2027-01-01', {
    archived: true
  }), item(5, 'Expired', '2020-01-01', {
    expiryAction: 'archive'
  })];
  onChanged = undefined;
  focused = undefined;
  visibility = undefined;
  api = bridge();
  nativeWindow = browser();
  nativeDocument = {
    addEventListener: vi.fn((...[, callback]: [string, () => void]) => {
      visibility = callback;
    }),
    removeEventListener: vi.fn()
  };
  vi.stubGlobal('window', nativeWindow);
  vi.stubGlobal('document', nativeDocument);
  Component = (await import('../CountdownTab')).CountdownTab;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('CountdownTab real shared hooks', () => {
  it('loading, loaded and saving states gate new event controls and stop wheel propagation', async () => {
    const initial = run();
    expect(text(initial)).toContain('countdown.manage.loading');
    expect(byClass(initial, 'cd-new-event').props.disabled).toBe(true);
    await mount();
    expect(visible().map((value) => value.id)).toEqual([2, 3, 1]);
    expect(byClass(run(), 'cd-new-event').props.disabled).toBe(false);
    const stopPropagation = vi.fn();
    invoke(byClass(run(), 'countdown-panel-v2'), 'onWheel', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    const pending = deferred<'updated'>();
    api.storeCompareAndSwap.mockReturnValueOnce(pending.promise);
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[0], 'pin');
    await settleHook();
    expect(byClass(run(), 'cd-new-event').props.disabled).toBe(true);
    pending.resolve('updated');
    await settleHook();
  });
  it('applies pinned/archived/category/text filters with trim, case and description fallback', async () => {
    await mount();
    filter('pinned');
    expect(visible().map((value) => value.id)).toEqual([2]);
    filter('archived');
    expect(visible().map((value) => value.id)).toEqual([4, 5]);
    filter('active');
    choose('countdown.form.type', 'birthday');
    expect(visible().map((value) => value.id)).toEqual([2]);
    choose('countdown.form.type', 'all');
    invoke(byClass(run(), 'cd-search'), 'onChange', {
      target: {
        value: '  SPECIAL  '
      }
    });
    expect(visible().map((value) => value.id)).toEqual([2]);
    invoke(byClass(run(), 'cd-search'), 'onChange', {
      target: {
        value: 'unknown'
      }
    });
    expect(visible()).toEqual([]);
  });
  it('name/date sort keep pins first and compare unpinned names or occurrence dates', async () => {
    await mount();
    choose('countdown.manage.sort', 'name');
    expect(visible().map((value) => value.id)).toEqual([2, 1, 3]);
    choose('countdown.manage.sort', 'date');
    expect(visible().map((value) => value.id)).toEqual([2, 3, 1]);
  });
  it('pin, archive and copy actions apply to the current authoritative snapshot', async () => {
    await mount();
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[0], 'pin');
    await settleHook();
    expect(disk[0].pinned).toBe(true);
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[0], 'pin');
    await settleHook();
    expect(disk[0].pinned).toBe(false);
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[0], 'archive');
    await settleHook();
    expect(disk[0].archived).toBe(true);
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[0], 'archive');
    await settleHook();
    expect(disk[0].archived).toBe(false);
    invoke(child(run(), 'CountdownCardList'), 'onAction', disk[1], 'copy');
    await settleHook();
    const copy = disk[disk.length - 1];
    expect(copy).toMatchObject({
      name: 'countdown.manage.copyName',
      pinned: false,
      archived: false,
      expiryAction: 'continue'
    });
    expect(copy.id).not.toBe(2);
  });
  it('stale action and delete callbacks never invent absent entries', async () => {
    await mount();
    const missing = item(999, 'missing', '2030-01-01');
    invoke(child(run(), 'CountdownCardList'), 'onAction', missing, 'copy');
    await settleHook();
    expect(disk).toHaveLength(5);
    await remove(missing);
    expect(elements(run()).some((node) => node.props.className === 'cd-feedback')).toBe(false);
  });
  it('deletes outside editor and undo restores removed item without duplicates', async () => {
    await mount();
    const [target] = disk;
    await remove(target);
    expect(disk.some((value) => value.id === target.id)).toBe(false);
    expect(text(run())).toContain('countdown.manage.undo');
    const undo = find(run(), (node) => node.type === 'button' && text(node) === 'countdown.manage.undo');
    invoke(undo, 'onClick');
    await settleHook();
    expect(disk.filter((value) => value.id === target.id)).toHaveLength(1);
    expect(elements(run()).some((node) => node.props.className === 'cd-feedback')).toBe(false);
    await remove(target);
    disk.push(target);
    onChanged?.('store:countdown-dates', disk);
    invoke(find(run(), (node) => node.type === 'button' && text(node) === 'countdown.manage.undo'), 'onClick');
    await settleHook();
    expect(disk.filter((value) => value.id === target.id)).toHaveLength(1);
  });
  it('failed deletion and undo keep retry state and render save errors', async () => {
    await mount();
    const [target] = disk;
    api.storeCompareAndSwap.mockResolvedValueOnce('error');
    await remove(target);
    expect(text(run())).toContain('countdown.manage.saveError');
    expect(disk).toHaveLength(5);
    await remove(target);
    api.storeCompareAndSwap.mockResolvedValueOnce('error');
    invoke(find(run(), (node) => node.type === 'button' && text(node) === 'countdown.manage.undo'), 'onClick');
    await settleHook();
    expect(text(run())).toContain('countdown.manage.undo');
    expect(disk.some((value) => value.id === target.id)).toBe(false);
  });
  it('real form opens new drafts, rejects empty name/date, saves trimmed name and closes only on success', async () => {
    await mount();
    invoke(byClass(run(), 'cd-new-event'), 'onClick');
    expect(byClass(run(), 'cd-page').props.inert).toBe(true);
    await invoke(child(run(), 'CountdownForm'), 'onSave');
    expect(api.storeCompareAndSwap).not.toHaveBeenCalled();
    draft({
      name: 'draft',
      date: ''
    });
    await invoke(child(run(), 'CountdownForm'), 'onSave');
    expect(api.storeCompareAndSwap).not.toHaveBeenCalled();
    draft({
      name: '  New item  ',
      date: '2027-02-03'
    });
    api.storeCompareAndSwap.mockResolvedValueOnce('error');
    await invoke(child(run(), 'CountdownForm'), 'onSave');
    expect(byClass(run(), 'cd-page').props.inert).toBe(true);
    await invoke(child(run(), 'CountdownForm'), 'onSave');
    expect(disk[disk.length - 1].name).toBe('New item');
    expect(byClass(run(), 'cd-page').props.inert).toBe(false);
  });
  it('real edit form updates one item, calendar selection changes draft and cancel closes drawer', async () => {
    await mount();
    invoke(child(run(), 'CountdownCardList'), 'onStartEdit', disk[0]);
    expect(child(run(), 'CountdownForm').props.editing).toBe(true);
    invoke(child(run(), 'CountdownCalendar'), 'onSelectDate', new Date(2027, 2, 4, 12));
    draft({
      name: 'Edited'
    });
    await invoke(child(run(), 'CountdownForm'), 'onSave');
    expect(disk[0]).toMatchObject({
      id: 1,
      name: 'Edited',
      date: '2027-03-04'
    });
    expect(disk[1].name).toBe('Beta');
    invoke(byClass(run(), 'cd-new-event'), 'onClick');
    invoke(child(run(), 'CountdownForm'), 'onCancel');
    expect(byClass(run(), 'cd-page').props.inert).toBe(false);
    invoke(byClass(run(), 'cd-new-event'), 'onClick');
    invoke(child(run(), 'CountdownDrawer'), 'onClose');
    expect(byClass(run(), 'cd-page').props.inert).toBe(false);
  });
  it('deleting the currently edited item uses default id and closes editor', async () => {
    await mount();
    invoke(child(run(), 'CountdownCardList'), 'onStartEdit', disk[0]);
    invoke(child(run(), 'CountdownForm'), 'onDelete');
    await settleHook();
    expect(byClass(run(), 'cd-page').props.inert).toBe(false);
    expect(disk.some((value) => value.id === 1)).toBe(false);
  });
  it('cover normalization handles empty/direct/file media and rejects synchronous bridge errors', async () => {
    await mount();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBeNull();
    leaves.cover = 'https://image.example/a';
    run();
    flushHookEffects();
    await settleHook();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBe(leaves.cover);
    leaves.cover = 'C:/photo.jpg';
    run();
    flushHookEffects();
    await settleHook();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBe('data:image/png;base64,cover');
    api.loadWallpaperFile.mockImplementation(() => {
      throw new Error('bridge sync failure');
    });
    leaves.cover = 'C:/bad.jpg';
    run();
    flushHookEffects();
    await settleHook();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBeNull();
  });
  it.each(['resolve', 'reject'] as const)('cancelled pending cover %s cannot replace the new image', async (mode) => {
    await mount();
    const pending = deferred<string | null>();
    api.loadWallpaperFile.mockReturnValueOnce(pending.promise);
    leaves.cover = 'C:/old.jpg';
    run();
    flushHookEffects();
    leaves.cover = 'https://image.example/new';
    run();
    flushHookEffects();
    await settleHook();
    if (mode === 'resolve') pending.resolve('data:old');else pending.reject(new Error('old failed'));
    await settleHook();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBe(leaves.cover);
  });
  it('cancelled synchronous bridge rejection cannot clear the replacement cover', async () => {
    await mount();
    api.loadWallpaperFile.mockImplementation(() => {
      throw new Error('bridge synchronous');
    });
    leaves.cover = 'C:/old.jpg';
    run();
    flushHookEffects();
    leaves.cover = 'https://image.example/replacement';
    run();
    flushHookEffects();
    await settleHook();
    expect(child(run(), 'CountdownForm').props.resolvedCoverImage).toBe(leaves.cover);
  });
  it('expired events change at midnight and native focus/visibility handlers refresh current date', async () => {
    disk = [item(1, 'today', '2026-10-06', {
      expiryAction: 'archive'
    })];
    await mount();
    expect(visible()).toHaveLength(1);
    vi.setSystemTime(new Date(2026, 9, 7, 0, 0));
    vi.advanceTimersByTime(30000);
    expect(visible()).toHaveLength(0);
    vi.setSystemTime(new Date(2026, 9, 6, 12));
    focused?.();
    expect(visible()).toHaveLength(1);
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    visibility?.();
    expect(visible()).toHaveLength(0);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    expect(nativeWindow.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(nativeDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
