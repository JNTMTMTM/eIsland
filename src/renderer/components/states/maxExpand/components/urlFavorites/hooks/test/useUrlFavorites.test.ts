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
 * @file useUrlFavorites.test.ts
 * @description 收藏真实子 Hook 集成、公开编辑分类、文件导入导出和拖拽排序测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useUrlFavorites } from '../useUrlFavorites';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { FOCUS_KEY, STORE_KEY } from '../../config/urlFavoritesConfig';
import NativeBookmarkParser from './nativeBookmarkParser';
import type { DragEvent } from 'react';
import type { UrlFavoriteItem } from '../../types/urlFavoritesTypes';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

const read = vi.fn();
const write = vi.fn();
const net = vi.fn();
const open = vi.fn();
const save = vi.fn();
const click = vi.fn();
let listener: (channel: string, value: unknown) => void;
let local: Map<string, string>;
let readers: ReaderLeaf[];
let failRead: boolean;

class ReaderLeaf {
  result: string | null = null;

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  /** 使用真实 File 文本，在浏览器读取叶边界模拟成功或失败。
   * @param file - 调用方选择的真实文件
   * @returns 原生读取事件派发完成
   */
  async readAsText(file: File): Promise<void> {
    readers.push(this);
    if (failRead) { this.onerror?.(); return; }
    this.result = await file.text();
    this.onload?.();
  }
}

/** 创建合法收藏快照。
 * @param extra - 需要覆盖的公开字段
 * @returns 收藏条目
 */
function row(extra: Partial<UrlFavoriteItem> = {}): UrlFavoriteItem {
  return { id: 1, url: 'https://one.example', title: 'First', note: 'note', folder: 'Work', createdAt: 1, ...extra };
}

/** 提交真实主 Hook 及四个真实子 Hook。
 * @returns 当前公开状态
 */
function render(): ReturnType<typeof useUrlFavorites> {
  const hook = renderHook(useUrlFavorites);
  flushHookEffects();
  return hook;
}

/** 完成原生读取后的生命周期。
 * @returns 已初始化状态
 */
async function mount(): Promise<ReturnType<typeof useUrlFavorites>> {
  render(); await settleHook(); render(); await settleHook(); return render();
}

/** 构建浏览器提供的拖拽事件叶数据。
 * @returns 可用于按钮或容器的原生拖拽事件
 */
function drag(): DragEvent<HTMLDivElement> {
  return { preventDefault: vi.fn(), dataTransfer: { effectAllowed: '', dropEffect: '', setData: vi.fn() } } as unknown as DragEvent<HTMLDivElement>;
}

beforeEach(() => {
  resetHook(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 5, 12));
  read.mockReset().mockResolvedValue([row(), row({ id: 2, url: 'https://two.example', folder: 'Personal' })]);
  write.mockReset().mockResolvedValue(true); net.mockReset().mockResolvedValue({ ok: true, body: '<title>Resolved</title>' });
  open.mockReset().mockResolvedValue(true); save.mockReset().mockResolvedValue({ ok: true }); click.mockReset();
  local = new Map(); readers = []; failRead = false;
  const storage = { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => { local.set(key, value); }, removeItem: (key: string) => { local.delete(key); } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('FileReader', ReaderLeaf);
  vi.stubGlobal('window', { setTimeout, clearTimeout, requestAnimationFrame: (callback: FrameRequestCallback) => { callback(0); return 1; }, api: { storeRead: read, storeWrite: write, netFetch: net, clipboardOpenUrl: open, saveTextFile: save, onSettingsChanged: (callback: typeof listener) => { listener = callback; return vi.fn(); } } });
  vi.stubGlobal('document', { querySelector: () => null });
});
afterEach(() => { unmountHook(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('derives categories and visible counts and creates or clears a normalized folder', async () => {
  let hook = await mount();
  expect(hook.folders).toEqual(['Personal', 'Work']);
  expect(hook.totalCount).toBe(2);
  hook.handleCreateFolder();
  expect(render().activeFolder).toBe('');
  hook.setNewFolderInput('  Work  ');
  hook = render(); hook.handleCreateFolder();
  hook = render(); expect(hook.visibleCount).toBe(1); expect(hook.newFolderInput).toBe('');
  hook.handleClearFolder('Personal');
  hook = render(); expect(hook.activeFolder).toBe('Work');
  hook.handleClearFolder('Work');
  hook = render(); expect(hook.activeFolder).toBe(''); expect(hook.folders).toEqual([]);
});

it.each(['', 'http://[', 'one.example', 'new.example'])('adds only a new valid URL: %s', async (url) => {
  let hook = await mount();
  hook.setUrlInput(url); hook = render(); hook.handleAdd();
  await settleHook(); hook = render();
  expect(hook.totalCount).toBe(url === 'new.example' ? 3 : 2);
  if (url === 'new.example') expect(hook.favorites[0]?.url).toBe('https://new.example');
});

it('renders the empty placeholder and clears ordinary expansion and native open failures', async () => {
  read.mockResolvedValue([]);
  let hook = await mount();
  expect(hook.placeholder).toBe('urlFavoritesTab.input.placeholderEmpty');
  hook.handleToggleExpand(row()); hook = render(); expect(hook.expandedId).toBe(1);
  hook.handleToggleExpand(row()); hook = render(); expect(hook.expandedId).toBeNull(); expect(hook.editUrlInput).toBe('');
  open.mockRejectedValue(new Error('open failed'));
  hook.handleOpen('https://one.example'); await settleHook(); expect(open).toHaveBeenCalledOnce();
});

it.each(['', 'http://[', 'https://two.example', 'new.example'])('validates an edited URL and updates only its matching row: %s', async (url) => {
  let hook = await mount();
  hook.handleToggleExpand(row()); hook = render();
  hook.setEditUrlInput(url); hook.setEditNoteInput('  New note  '); hook.setEditFolderInput('  Changed  ');
  hook = render(); hook.handleSaveEdit(1); await settleHook(); hook = render();
  expect(hook.favorites[0]?.url).toBe(url === 'new.example' ? 'https://new.example' : 'https://one.example');
  if (url === 'new.example') { expect(hook.favorites[0]?.note).toBe('New note'); expect(hook.favorites[0]?.folder).toBe('Changed'); }
  expect(hook.favorites[1]?.url).toBe('https://two.example');
});

it.each([false, true])('removes an item and clears only matching expansion: %s', async (expanded) => {
  let hook = await mount();
  if (expanded) { hook.handleToggleExpand(row()); hook = render(); }
  hook.handleRemove(1); hook = render();
  expect(hook.favorites.map((item) => item.id)).toEqual([2]);
  expect(hook.expandedId).toBeNull();
});

it('handles consecutive native focus restores without an old timeout clearing a newer focus', async () => {
  local.set(FOCUS_KEY, 'one.example');
  let hook = await mount(); expect(hook.focusedId).toBe(1);
  await vi.advanceTimersByTimeAsync(1000);
  local.set(FOCUS_KEY, 'two.example'); listener(`store:${STORE_KEY}`, [row(), row({ id: 2, url: 'https://two.example' })]);
  render(); hook = render(); expect(hook.focusedId).toBe(2);
  await vi.advanceTimersByTimeAsync(800); expect(render().focusedId).toBe(2);
  await vi.advanceTimersByTimeAsync(1000); expect(render().focusedId).toBeNull();
});

it.each([false, true])('opens native file input and handles read failures: ref=%s', async (hasRef) => {
  let hook = await mount();
  if (hasRef) hook.importInputRef.current = { click, value: 'selected' } as unknown as HTMLInputElement;
  hook.handleImportClick();
  expect(click).toHaveBeenCalledTimes(hasRef ? 1 : 0);
  hook.handleImportFile(null); expect(readers).toHaveLength(0);
  failRead = true; hook.handleImportFile(new File(['[]'], 'favorites.json'));
  hook = render(); expect(hook.statusMessage).toBe('urlFavoritesTab.messages.importFailed');
  if (hasRef) expect(hook.importInputRef.current?.value).toBe('');
  unmountHook(); expect(vi.getTimerCount()).toBe(0);
});

it.each(['invalid', 'empty', 'duplicates', 'new'])('parses a real JSON file and merges the imported favorites: %s', async (mode) => {
  let hook = await mount();
  hook.importInputRef.current = { value: 'selected' } as HTMLInputElement;
  const contents = { invalid: '{', empty: '[]', duplicates: JSON.stringify([row()]), new: JSON.stringify([row({ url: 'https://new.example' })]) };
  hook.handleImportFile(new File([contents[mode as keyof typeof contents]], 'favorites.json'));
  await settleHook(); hook = render();
  expect(hook.totalCount).toBe(mode === 'new' ? 3 : 2);
  const expected = { invalid: 'importFailed', empty: 'importEmpty', duplicates: 'importEmpty', new: 'importSuccess' };
  expect(hook.statusMessage).toBe(`urlFavoritesTab.messages.${expected[mode as keyof typeof expected]}`);
  expect(hook.importInputRef.current?.value).toBe('');
  await vi.advanceTimersByTimeAsync(2400); expect(render().statusMessage).toBe('');
});

it('imports HTML through the native parser and handles a missing input ref on successful reads', async () => {
  vi.stubGlobal('DOMParser', NativeBookmarkParser);
  let hook = await mount(); hook.setImportFormat('html'); hook = render();
  hook.handleImportFile(new File(['<a href="https://new.example">New</a>'], 'favorites.html'));
  await settleHook(); hook = render();
  expect(hook.totalCount).toBe(3); expect(hook.statusMessage).toBe('urlFavoritesTab.messages.importSuccess');
});

it.each([{ json: true, result: 'success' }, { json: false, result: 'success' }, { json: true, result: 'failed' }, { json: true, result: 'canceled' }, { json: true, result: 'rejected' }])('exports real serialization: json=$json result=$result', async ({ json, result }) => {
  let hook = await mount(); hook.setExportFormat(json ? 'json' : 'html'); hook = render();
  if (result === 'rejected') save.mockRejectedValue(new Error('write failed'));
  else save.mockResolvedValue({ ok: result === 'success', canceled: result === 'canceled' });
  hook.handleExport(); await settleHook(); hook = render();
  const payload = save.mock.calls[0]?.[0] as { defaultPath: string; content: string };
  expect(payload.defaultPath).toBe(`eIsland-url-favorites-2026-10-05.${json ? 'json' : 'html'}`);
  expect(payload.content).toContain('https://one.example');
  const expected = result === 'success' ? 'urlFavoritesTab.messages.exportSuccess' : 'urlFavoritesTab.messages.exportFailed';
  expect(hook.statusMessage).toBe(result === 'canceled' ? '' : expected);
});

it('replaces status timers on consecutive native export completions', async () => {
  const hook = await mount(); hook.handleExport(); await settleHook();
  save.mockResolvedValue({ ok: false }); hook.handleExport(); await settleHook();
  expect(vi.getTimerCount()).toBe(1);
  expect(render().statusMessage).toBe('urlFavoritesTab.messages.exportFailed');
  await vi.advanceTimersByTimeAsync(2400); expect(render().statusMessage).toBe('');
});

it.each([{ from: null, to: 2 }, { from: 1, to: 1 }, { from: 99, to: 1 }, { from: 1, to: 99 }, { from: 1, to: 2 }])('uses real drag state and reorders only existing distinct rows: $from -> $to', async ({ from, to }) => {
  let hook = await mount(); const event = drag();
  const prevent = vi.spyOn(event, 'preventDefault');
  hook.handleDragOver(event, to); expect(prevent).not.toHaveBeenCalled();
  if (from !== null) {
    hook.handleDragStart(event as unknown as DragEvent<HTMLButtonElement>, from); hook = render();
    hook.handleDragOver(event, from); hook.handleDragOver(event, to); hook = render();
    expect(hook.draggingId).toBe(from); expect(hook.dragOverId).toBe(to);
  }
  hook.handleDrop(event, to); hook = render();
  expect(hook.favorites.map((item) => item.id)).toEqual(from === 1 && to === 2 ? [2, 1] : [1, 2]);
  expect(hook.draggingId).toBeNull();
  await vi.advanceTimersByTimeAsync(0); expect(hook.dragMovedRef.current).toBe(false);
});
