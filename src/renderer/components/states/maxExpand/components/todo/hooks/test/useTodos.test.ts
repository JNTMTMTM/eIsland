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
 * @file useTodos.test.ts
 * @description 待办真实存储迁移、外部同步、主子任务编辑、日期校验和界面回调测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodos } from '../useTodos';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { KeyboardEvent } from 'react';
import type { TodoItem } from '../../types/todoTypes';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>()
};
const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();
const unsubscribe = vi.fn<() => void>();
const focus = vi.fn<() => void>();
const scrollTo = vi.fn<(options: ScrollToOptions) => void>();
const updateEvent = vi.fn<(event: Event) => void>();
let cached: string | null;
const frames: FrameRequestCallback[] = [];

/**
 * 创建公开存储输入的待办记录。
 * @param id - 待办标识。
 * @param fields - 输入字段差异。
 * @returns 经真实工具归一化的输入数据。
 */
function todo(id: number, fields: Partial<TodoItem> = {}): TodoItem {
  return { id, text: `Task ${id}`, done: false, createdAt: new Date(2026, 0, 2).getTime(), ...fields };
}

/**
 * 渲染真实 Hook 并保留公开事件产生的状态。
 * @returns 当前待办状态和公开操作。
 */
function view() {
  return renderWithHooks(useTodos);
}

/**
 * 执行真实加载及持久化 effect。
 * @returns 已处理异步回调的状态。
 */
async function commit(): Promise<ReturnType<typeof view>> {
  view();
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
  await Promise.resolve();
  return view();
}

/**
 * 广播外部待办存储更新。
 * @param value - 更新内容。
 * @param channel - 原生通道。
 */
function sync(value: unknown, channel = 'store:todos'): void {
  const [[listener]] = api.onSettingsChanged.mock.calls;
  listener(channel, value);
}

/** 执行安排好的原生动画帧回调。 */
function tick(): void {
  frames.splice(0).forEach((callback) => callback(0));
}

beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 2, 12));
  vi.clearAllMocks();
  frames.length = 0;
  cached = null;
  api.storeRead.mockReset().mockResolvedValue([]);
  api.storeWrite.mockReset().mockResolvedValue(true);
  api.onSettingsChanged.mockReset().mockReturnValue(unsubscribe);
  getItem.mockReset().mockImplementation(() => cached);
  setItem.mockReset().mockImplementation((key, value) => { void key; cached = value; });
  const surface = new EventTarget();
  surface.addEventListener('eisland:todos-updated', updateEvent);
  vi.stubGlobal('window', Object.assign(surface, { api }));
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Todo loading, fallback and persistence', () => {
  it('loads native records before legacy cache and normalizes optional fields', async () => {
    api.storeRead.mockResolvedValue([todo(1)]);
    cached = JSON.stringify([todo(99)]);
    view();
    expect(api.storeWrite).not.toHaveBeenCalled();
    await commit();
    expect(view().todos).toEqual([expect.objectContaining({ id: 1, description: '', subTodos: [] })]);
    expect(getItem).not.toHaveBeenCalled();
    expect(JSON.parse(cached ?? '[]')).toEqual(view().todos);
    const [[event]] = updateEvent.mock.calls;
    expect((event as CustomEvent<unknown>).detail).toEqual(view().todos);
  });

  it.each(['empty', 'invalid', 'reject'])('restores real legacy cache after native %s', async (outcome) => {
    cached = JSON.stringify([todo(2)]);
    if (outcome === 'invalid') api.storeRead.mockResolvedValue({ invalid: true });
    if (outcome === 'reject') api.storeRead.mockRejectedValue(new Error('native store unavailable'));
    await commit();
    expect(view().todos[0].id).toBe(2);
    expect(api.storeWrite).toHaveBeenCalledWith('todos', view().todos);
    expect(getItem).toHaveBeenCalledWith('eIsland_todos');
  });

  it.each([
    { outcome: 'resolve', cache: null }, { outcome: 'reject', cache: null },
    { outcome: 'resolve', cache: '{broken' }, { outcome: 'reject', cache: '{broken' },
    { outcome: 'resolve', cache: '{}' }, { outcome: 'reject', cache: '{}' }
  ])('recovers unusable cache $cache after $outcome', async ({ outcome, cache }) => {
    cached = cache;
    if (outcome === 'reject') api.storeRead.mockRejectedValue(new Error('read unavailable'));
    await commit();
    expect(view().todos).toEqual([]);
    expect(api.storeWrite).toHaveBeenCalledWith('todos', []);
  });

  it('absorbs migration write and local storage exceptions and preserves external updates without echoing them', async () => {
    cached = JSON.stringify([todo(1)]);
    api.storeWrite.mockRejectedValue(new Error('write failure'));
    setItem.mockImplementation(() => { throw new Error('local quota'); });
    await commit();
    api.storeWrite.mockClear();
    sync(null);
    sync([todo(3)], 'unknown');
    expect(view().todos[0].id).toBe(1);
    sync([todo(2)]);
    await commit();
    expect(view().todos[0].id).toBe(2);
    expect(api.storeWrite).not.toHaveBeenCalled();
    view().saveTitle(2, 'Edited');
    await commit();
    expect(api.storeWrite).toHaveBeenCalledWith('todos', view().todos);
    expect(view().todos[0].text).toBe('Edited');
  });

  it.each(['resolve', 'reject'])('handles denied legacy reads after native %s', async (outcome) => {
    getItem.mockImplementation(() => { throw new Error('storage denied'); });
    if (outcome === 'reject') api.storeRead.mockRejectedValue(new Error('native denied'));
    await commit();
    expect(view().todos).toEqual([]);
  });

  it.each(['resolve', 'reject'])('ignores a pending native %s and stale broadcasts after unmount', async (outcome) => {
    let resolve: ((value: unknown) => void) | undefined;
    let reject: ((reason: Error) => void) | undefined;
    api.storeRead.mockReturnValue(new Promise((done, fail) => { resolve = done; reject = fail; }));
    view();
    runEffects();
    unmountHooks();
    if (outcome === 'resolve') resolve?.([todo(1)]);
    else reject?.(new Error('late rejection'));
    await Promise.resolve();
    await Promise.resolve();
    sync([todo(2)]);
    expect(view().todos).toEqual([]);
    expect(api.storeWrite).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('Todo main and child public operations', () => {
  it('ignores blank input, adds trimmed tasks through keyboard and scrolls only attached list refs', async () => {
    await commit();
    view().setInput('   ');
    view().handleAdd();
    expect(view().todos).toEqual([]);
    const preventDefault = vi.fn<() => void>();
    view().handleKeyDown({ preventDefault, key: 'Escape' } as unknown as KeyboardEvent<HTMLInputElement>);
    expect(preventDefault).not.toHaveBeenCalled();
    view().listRef.current = { scrollTo, scrollHeight: 240 } as unknown as HTMLDivElement;
    view().setInput('  New task ');
    view().setPriority('P0');
    view().setSize('XL');
    view().handleKeyDown({ preventDefault, key: 'Enter' } as unknown as KeyboardEvent<HTMLInputElement>);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(view().todos[0]).toMatchObject({ text: 'New task', priority: 'P0', size: 'XL', done: false, description: '', subTodos: [] });
    expect(view().input).toBe('');
    expect(view().priority).toBeUndefined();
    expect(view().size).toBeUndefined();
    tick();
    expect(scrollTo).toHaveBeenCalledWith({ top: 240, behavior: 'smooth' });
    view().listRef.current = null;
    vi.advanceTimersByTime(1);
    view().setInput('Second');
    view().handleAdd();
    tick();
    expect(scrollTo).toHaveBeenCalledOnce();
  });

  it('edits only matching main titles and descriptions, toggles completion and computes priority counts', async () => {
    api.storeRead.mockResolvedValue([todo(1, { priority: 'P0' }), todo(2, { priority: 'P1' }), todo(3, { priority: 'P2' }), todo(4, { priority: 'P0', done: true })]);
    await commit();
    expect([view().p0Count, view().p1Count, view().p2Count, view().doneCount, view().undoneCount]).toEqual([1, 1, 1, 1, 3]);
    view().saveTitle(1, ' ');
    expect(view().todos[0].text).toBe('Task 1');
    view().saveTitle(1, ' Edited ');
    view().saveDesc(1, 'Description');
    expect(view().todos[0]).toMatchObject({ text: 'Edited', description: 'Description' });
    expect(view().todos[1].text).toBe('Task 2');
    view().toggleDone(1);
    expect(view().todos[0].done).toBe(true);
    expect(view().p0Count).toBe(0);
    view().toggleDone(1);
    expect(view().todos[0].done).toBe(false);
    view().toggleExpand(1);
    expect(view().expandedId).toBe(1);
    view().removeTodo(2);
    expect(view().expandedId).toBe(1);
    view().removeTodo(1);
    expect(view().expandedId).toBeNull();
  });

  it('validates and clears due dates while preserving other tasks', async () => {
    api.storeRead.mockResolvedValue([todo(1), todo(2)]);
    await commit();
    view().setDueDate(1, 'invalid');
    view().setDueDate(1, '2026-01-01');
    expect(view().todos[0].dueDate).toBeUndefined();
    view().setDueDate(1, '2026-01-02');
    expect(view().todos[0].dueDate).toBe('2026-01-02');
    expect(view().todos[1].dueDate).toBeUndefined();
    view().setDueDate(1, '');
    expect(view().todos[0].dueDate).toBeUndefined();
  });

  it('clears child editor drafts on expansion and adds, edits, toggles and removes matching children', async () => {
    api.storeRead.mockResolvedValue([todo(1, { subTodos: [{ id: 11, text: 'Existing', done: false }] }), todo(2)]);
    await commit();
    view().setSubInput('draft');
    view().setSubPriority('P1');
    view().setSubSize('M');
    view().toggleExpand(1);
    expect(view().subInput).toBe('');
    expect(view().subPriority).toBeUndefined();
    expect(view().subSize).toBeUndefined();
    view().toggleExpand(1);
    expect(view().expandedId).toBeNull();
    view().addSubTodo(1);
    expect(view().todos[0].subTodos).toHaveLength(1);
    view().subInputRef.current = { focus } as unknown as HTMLInputElement;
    view().setSubInput(' Child ');
    view().setSubPriority('P2');
    view().setSubSize('S');
    view().addSubTodo(1);
    const child = view().todos[0].subTodos?.[1];
    expect(child).toMatchObject({ text: 'Child', done: false, priority: 'P2', size: 'S' });
    tick();
    expect(focus).toHaveBeenCalledOnce();
    view().saveSubTitle(1, 11, ' ');
    expect(view().todos[0].subTodos?.[0].text).toBe('Existing');
    view().saveSubTitle(1, 11, ' Edited child ');
    view().toggleSubDone(1, 11);
    expect(view().todos[0].subTodos?.[0]).toMatchObject({ text: 'Edited child', done: true });
    view().toggleSubDone(2, 99);
    view().removeSubTodo(2, 99);
    view().removeSubTodo(1, 11);
    expect(view().todos[0].subTodos).toHaveLength(1);
    expect(view().todos[0].subTodos?.[0].text).toBe('Child');
    expect(view().todos[1].subTodos).toEqual([]);
    view().subInputRef.current = null;
    view().setSubInput('Another');
    view().addSubTodo(1);
    tick();
    expect(focus).toHaveBeenCalledOnce();
  });
});
