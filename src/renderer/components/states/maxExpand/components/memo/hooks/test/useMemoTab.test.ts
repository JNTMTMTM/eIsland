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
 * @file useMemoTab.test.ts
 * @description 备忘录真实加载、持久化、编辑标签、批量操作、搜索排序与资源清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoTab } from '../useMemoTab';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { MemoItem } from '../../types/memoTypes';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const storeRead = vi.fn<Window['api']['storeRead']>();
const storeWrite = vi.fn<Window['api']['storeWrite']>();
const onSettingsChanged = vi.fn<Window['api']['onSettingsChanged']>();
const unsubscribe = vi.fn<() => void>();
const focus = vi.fn<() => void>();
const observe = vi.fn<(element: Element) => void>();
const disconnect = vi.fn<() => void>();
let resize: (() => void) | undefined;

/**
 * 创建业务输入备忘录，允许每个场景改变公开存储数据。
 * @param id - 备忘录标识。
 * @param fields - 数据差异。
 * @returns 真正归一化和筛选的备忘录输入。
 */
function memo(id: number, fields: Partial<MemoItem> = {}): MemoItem {
  return { id, title: `Note ${id}`, content: '', tags: [], createdAt: 1, updatedAt: id, pinned: false, bookmarked: false, ...fields };
}

/**
 * 重复求值真实 Hook，保存公开操作更新的状态。
 * @returns 当前备忘录状态。
 */
function view() {
  return renderWithHooks(useMemoTab);
}

/**
 * 提交真实依赖变化和加载/持久化回调。
 * @returns 加载后状态。
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
 * 调用已注册的真实原生存储更新监听器。
 * @param value - 原生存储内容。
 * @param channel - 广播通道。
 */
function sync(value: unknown, channel = 'store:memos'): void {
  const [[listener]] = onSettingsChanged.mock.calls;
  listener(channel, value);
}

beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.clearAllMocks();
  resize = undefined;
  storeRead.mockReset().mockResolvedValue([]);
  storeWrite.mockReset().mockResolvedValue(true);
  onSettingsChanged.mockReset().mockReturnValue(unsubscribe);
  vi.stubGlobal('window', { api: { storeRead, storeWrite, onSettingsChanged } });
  vi.stubGlobal('ResizeObserver', class {
    /**
     * 保存真实 Hook 提供的原生观察回调。
     * @param callback - 元素尺寸变化回调。
     */
    constructor(callback: () => void) { resize = callback; }

    observe = observe;

    disconnect = disconnect;
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Memo loading, persistence and lifecycle', () => {
  it.each([[], null, { invalid: true }])('loads empty or unusable initial storage %j', async (data) => {
    storeRead.mockResolvedValue(data);
    expect(view().loaded).toBe(false);
    expect(storeWrite).not.toHaveBeenCalled();
    await commit();
    expect(view().loaded).toBe(true);
    expect(view().memos).toEqual([]);
    expect(storeWrite).toHaveBeenCalledWith('memos', []);
  });

  it('loads older memo records through the real normalizer and avoids re-persisting external changes', async () => {
    storeRead.mockResolvedValue([{ id: 1, content: '# Header', tags: [' #topic ', 'topic', 1] }]);
    await commit();
    expect(view().memos).toEqual([{ id: 1, title: '', content: '# Header', tags: ['topic'], createdAt: 1000, updatedAt: 1000, pinned: false, bookmarked: false }]);
    storeWrite.mockClear();
    sync({ invalid: true });
    sync([], 'other');
    expect(view().memos).toHaveLength(1);
    sync([memo(2)]);
    await commit();
    expect(view().memos.map((item) => item.id)).toEqual([2]);
    expect(storeWrite).not.toHaveBeenCalled();
    view().handleTitleChange(2, 'Changed');
    await commit();
    expect(storeWrite).toHaveBeenCalledWith('memos', expect.arrayContaining([expect.objectContaining({ title: 'Changed' })]));
  });

  it('recovers read failures, absorbs write failures and cleans up subscriptions', async () => {
    storeRead.mockRejectedValue(new Error('read failure'));
    storeWrite.mockRejectedValue(new Error('write failure'));
    await commit();
    expect(view().loaded).toBe(true);
    view().handleAdd();
    await commit();
    expect(view().memos).toHaveLength(1);
    unmountHooks();
    sync([memo(99)]);
    expect(view().memos).toHaveLength(1);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(['resolve', 'reject'])('ignores pending initialization %s after unmount', async (outcome) => {
    let resolve: ((value: unknown) => void) | undefined;
    let reject: ((reason: Error) => void) | undefined;
    storeRead.mockReturnValue(new Promise((done, fail) => { resolve = done; reject = fail; }));
    view();
    runEffects();
    unmountHooks();
    if (outcome === 'resolve') resolve?.([memo(1)]);
    else reject?.(new Error('late failure'));
    await Promise.resolve();
    await Promise.resolve();
    expect(view().loaded).toBe(false);
    expect(view().memos).toEqual([]);
  });

  it('measures tag scrolling via real observer callbacks and disconnects on dependency change and unmount', async () => {
    const dimensions = { scrollWidth: 150, clientWidth: 100 };
    view().tagFilterRef.current = dimensions as unknown as HTMLDivElement;
    await commit();
    expect(view().tagFilterScrollable).toBe(true);
    expect(observe).toHaveBeenCalledWith(dimensions);
    dimensions.scrollWidth = 101;
    resize?.();
    expect(view().tagFilterScrollable).toBe(false);
    sync([memo(1, { tags: ['topic'] })]);
    await commit();
    expect(disconnect).toHaveBeenCalled();
    unmountHooks();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});

describe('Memo public editing and collection operations', () => {
  it('adds memo records, focuses an attached title and tolerates a missing title ref', async () => {
    await commit();
    view().titleRef.current = { focus } as unknown as HTMLInputElement;
    view().handleAdd();
    expect(view().selectedId).toBe(1000);
    expect(view().selectedMemo?.title).toBe('');
    expect(view().markdownPreviewContent).toBe('maxExpand.memo.contentPlaceholder');
    vi.advanceTimersByTime(50);
    expect(focus).toHaveBeenCalledOnce();
    view().titleRef.current = null;
    vi.setSystemTime(2000);
    view().handleAdd();
    vi.advanceTimersByTime(50);
    expect(view().memos.map((item) => item.id)).toEqual([2000, 1000]);
    expect(focus).toHaveBeenCalledOnce();
    view().setViewMode('split');
    view().setTagEditorOpen(true);
    view().setEditorScroll({ left: 1, top: 2 });
    expect(view().viewModes.map((mode) => mode.id)).toEqual(['edit', 'preview', 'split']);
    expect(view().viewMode).toBe('split');
    expect(view().tagEditorOpen).toBe(true);
    expect(view().editorScroll).toEqual({ left: 1, top: 2 });
  });

  it('updates matching memo titles/content/bookmarks/pins while preserving other records', async () => {
    storeRead.mockResolvedValue([memo(1), memo(2)]);
    await commit();
    view().setSelectedId(1);
    view().handleTitleChange(1, 'Edited');
    view().handleContentChange(1, '# Heading\n**Body**');
    view().handleToggleBookmark(1);
    view().handleTogglePin(1);
    expect(view().selectedMemo).toMatchObject({ title: 'Edited', content: '# Heading\n**Body**', bookmarked: true, pinned: true, updatedAt: 1000 });
    expect(view().memos[1]).toEqual(memo(2));
    expect(view().markdownPreviewContent).toBe('# Heading\n**Body**');
    expect(view().markdownEditorMirror.length).toBeGreaterThan(0);
    view().handleToggleBookmark(1);
    view().handleTogglePin(1);
    expect(view().selectedMemo).toMatchObject({ bookmarked: false, pinned: false });
  });

  it('normalizes added tags, drops empty values and removes only requested memo tags', async () => {
    storeRead.mockResolvedValue([memo(1), memo(2, { tags: ['keep'] })]);
    await commit();
    view().setTagInput(' # ');
    view().handleAddTag(1);
    expect(view().memos[0].tags).toEqual([]);
    view().setTagInput(' ##topic ');
    view().handleAddTag(1);
    expect(view().memos[0].tags).toEqual(['topic']);
    expect(view().activeTag).toBe('topic');
    expect(view().tagInput).toBe('');
    view().setTagInput('topic');
    view().handleAddTag(1);
    expect(view().memos[0].tags).toEqual(['topic']);
    view().handleRemoveTag(1, 'topic');
    expect(view().memos[0].tags).toEqual([]);
    expect(view().memos[1].tags).toEqual(['keep']);
    await commit();
    expect(view().activeTag).toBeNull();
  });

  it('clears selection when deleting its memo and retains a different selected memo', async () => {
    storeRead.mockResolvedValue([memo(1), memo(2)]);
    await commit();
    view().setSelectedId(2);
    view().handleToggleMemoSelection(1);
    view().handleDelete(1);
    expect(view().selectedId).toBe(2);
    expect(view().selectedMemoCount).toBe(0);
    view().handleDelete(2);
    expect(view().selectedId).toBeNull();
    await commit();
    expect(view().memos).toEqual([]);
    expect(view().bulkSelectMode).toBe(false);
  });

  it.each([null, 1, 2])('removes selected memo IDs with active memo %s', async (selected) => {
    storeRead.mockResolvedValue([memo(1), memo(2)]);
    await commit();
    view().handleDeleteSelected();
    expect(view().memos).toHaveLength(2);
    view().handleToggleBulkSelect();
    expect(view().bulkSelectMode).toBe(true);
    view().handleToggleMemoSelection(1);
    view().handleToggleMemoSelection(1);
    expect(view().selectedMemoCount).toBe(0);
    view().handleToggleMemoSelection(1);
    view().setSelectedId(selected);
    view().handleDeleteSelected();
    expect(view().memos.map((item) => item.id)).toEqual([2]);
    expect(view().selectedId).toBe(selected === 1 ? null : selected);
    expect(view().selectedMemoIds.size).toBe(0);
    expect(view().bulkSelectMode).toBe(false);
  });

  it('exits bulk mode and reconciles selected IDs after an external collection update', async () => {
    storeRead.mockResolvedValue([memo(1), memo(2)]);
    await commit();
    view().handleToggleBulkSelect();
    view().handleToggleMemoSelection(1);
    view().handleToggleBulkSelect();
    expect(view().selectedMemoIds.size).toBe(0);
    view().handleToggleBulkSelect();
    view().handleToggleMemoSelection(1);
    view().handleToggleMemoSelection(2);
    sync([memo(2)]);
    await commit();
    expect([...view().selectedMemoIds]).toEqual([2]);
    sync([]);
    await commit();
    expect(view().selectedMemoIds.size).toBe(0);
    expect(view().bulkSelectMode).toBe(false);
  });

  it('ranks tags by frequency then name, filters bookmarks/tags/search and sorts pins before recent notes', async () => {
    storeRead.mockResolvedValue([
      memo(1, { title: 'Alpha #inline', tags: ['z', 'a'], updatedAt: 20, bookmarked: true }),
      memo(2, { title: 'Beta', tags: ['a'], updatedAt: 30, pinned: true }),
      memo(3, { title: 'Gamma', tags: ['b'], updatedAt: 10 })
    ]);
    await commit();
    expect(view().memoTags).toEqual([['a', 2], ['b', 1], ['inline', 1], ['z', 1]]);
    expect(view().filteredMemos.map((item) => item.id)).toEqual([2, 1, 3]);
    view().setBookmarkOnly(true);
    expect(view().filteredMemos.map((item) => item.id)).toEqual([1]);
    view().setBookmarkOnly(false);
    view().setActiveTag('a');
    expect(view().filteredMemos.map((item) => item.id)).toEqual([2, 1]);
    view().setSearch(' ALPHA ');
    expect(view().filteredMemos.map((item) => item.id)).toEqual([1]);
    view().setActiveTag(null);
    view().setSearch('inline');
    expect(view().filteredMemos.map((item) => item.id)).toEqual([1]);
    view().setSearch('missing');
    expect(view().filteredMemos).toEqual([]);
  });
});
