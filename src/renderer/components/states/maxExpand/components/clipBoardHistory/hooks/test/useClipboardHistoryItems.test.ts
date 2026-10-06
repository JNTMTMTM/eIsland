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
 * @file useClipboardHistoryItems.test.ts
 * @description 剪贴板真实存档归一化、轮询去重、编辑复制、原生失败与卸载竞争测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useClipboardHistoryItems } from '../useClipboardHistoryItems';
import useIslandStore from '../../../../../../../store/slices';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { DEFAULT_HISTORY_LIMIT, EXIT_MAX_EXPAND_ON_COPY_STORE_KEY, HISTORY_ENABLED_STORE_KEY, HISTORY_LIMIT_STORE_KEY, LOCAL_STORAGE_KEY, STORE_KEY } from '../../config/clipboardHistoryConfig';
import type { ClipboardHistoryItem, UseClipboardHistoryItemsReturn } from '../../types/clipboardHistoryTypes';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {}, location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
});

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  vi.doMock('react-i18next', async () => ({
    ...await vi.importActual<typeof import('react-i18next')>('react-i18next'),
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
  }));
  return { ...createHookReactMock(actual), useSyncExternalStore: (...args: [unknown, () => unknown]) => args[1](), useDebugValue: vi.fn() };
});

// 仅桥接 Zustand 的 React 绑定，保留整个真实 store 及所有状态动作。
vi.mock('../../../../../../../store/slices', async (original) => {
  const actual = await original<typeof import('../../../../../../../store/slices')>();
  const store = actual.default;
  return { ...actual, default: Object.assign(() => store.getState(), store) };
});

const read = vi.fn();
const write = vi.fn();
const clipboardRead = vi.fn();
const clipboardWrite = vi.fn();
const feedback = vi.fn();
let stored: Map<string, unknown>;
let local: Map<string, string>;
let storage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
const snapshot = useIslandStore.getState();

/** 用真实 Hook 提交生命周期。
 * @returns 当前公开状态与回调
 */
function render(): UseClipboardHistoryItemsReturn {
  const value = renderHook(useClipboardHistoryItems, feedback);
  flushHookEffects();
  return value;
}

/** 完成原生读取后的状态提交。
 * @returns 已加载的公开状态
 */
async function mount(): Promise<UseClipboardHistoryItemsReturn> {
  render();
  await settleHook();
  render();
  await settleHook();
  return render();
}

/** 创建有固定时间的持久化条目。
 * @param id - 业务条目 ID
 * @param text - 需要保存的文本
 * @returns 公共剪贴板数据
 */
function row(id = 1, text = 'old text'): ClipboardHistoryItem { return { id, text, createdAt: 1 }; }

beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5, 12));
  useIslandStore.setState(snapshot, true);
  stored = new Map([[STORE_KEY, [row()]]]);
  local = new Map();
  read.mockReset().mockImplementation((key: string) => Promise.resolve(stored.get(key)));
  write.mockReset().mockResolvedValue(true);
  clipboardRead.mockReset().mockResolvedValue('');
  clipboardWrite.mockReset().mockResolvedValue(true);
  feedback.mockReset();
  storage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => { local.set(key, value); } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { setInterval, clearInterval, api: { storeRead: read, storeWrite: write, clipboardReadText: clipboardRead, clipboardWriteText: clipboardWrite } });
});
afterEach(() => { unmountHook(); useIslandStore.setState(snapshot, true); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([NaN, Infinity, undefined, 0, 1.6, 60])('loads limits with real finite validation: %s', async (limit) => {
  stored.set(HISTORY_LIMIT_STORE_KEY, limit);
  const hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.items).toEqual([row()]);
  expect(hook.historyLimit).toBe(typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.round(limit))) : DEFAULT_HISTORY_LIMIT);
});

it.each([false, true])('honors native historyEnabled=%s and truncates changed limits', async (enabled) => {
  stored.set(HISTORY_ENABLED_STORE_KEY, enabled);
  stored.set(HISTORY_LIMIT_STORE_KEY, 1);
  const hook = await mount();
  const reads = clipboardRead.mock.calls.length;
  clipboardRead.mockResolvedValue('new text');
  await vi.advanceTimersByTimeAsync(1000);
  expect(clipboardRead.mock.calls.length - reads).toBe(enabled ? 1 : 0);
  expect(render().items).toHaveLength(1);
  expect(render().items[0]?.text).toBe(enabled ? 'new text' : 'old text');
  hook.setItems([row(), row(2)]);
});

it.each(['missing', 'valid', 'invalid', 'read-failed'])('loads local fallback %s and contains migration writes', async (mode) => {
  stored.set(STORE_KEY, []);
  if (mode === 'valid') local.set(LOCAL_STORAGE_KEY, JSON.stringify([row(2)]));
  if (mode === 'invalid') local.set(LOCAL_STORAGE_KEY, '{');
  if (mode === 'read-failed') storage.getItem = () => { throw new Error('storage blocked'); };
  write.mockRejectedValue(new Error('migration failed'));
  const hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.items).toEqual(mode === 'valid' ? [row(2)] : []);
});

it.each(['missing', 'valid', 'invalid', 'read-failed'])('contains settings failures with local fallback %s', async (mode) => {
  read.mockRejectedValue(new Error('native settings failed'));
  if (mode === 'valid') local.set(LOCAL_STORAGE_KEY, JSON.stringify([row(2)]));
  if (mode === 'invalid') local.set(LOCAL_STORAGE_KEY, '{');
  if (mode === 'read-failed') storage.getItem = () => { throw new Error('storage blocked'); };
  const hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.historyLimit).toBe(DEFAULT_HISTORY_LIMIT);
  expect(hook.items).toEqual(mode === 'valid' ? [row(2)] : []);
});

it.each(['settings-resolve', 'settings-reject', 'history-resolve'])('ignores native completion after unmount: %s', async (mode) => {
  const pending = deferred<unknown>();
  if (mode === 'history-resolve') read.mockImplementation((key: string) => key === STORE_KEY ? pending.promise : Promise.resolve(true));
  else read.mockReturnValue(pending.promise);
  render();
  await settleHook();
  unmountHook();
  if (mode === 'settings-reject') pending.reject(new Error('late read'));
  else pending.resolve([row()]);
  await settleHook();
  expect(write).not.toHaveBeenCalled();
});

it('records ordinary text, skips passwords and duplicates, and promotes an existing older entry', async () => {
  const hook = await mount();
  await [' ', 'Abcd1234!', 'old text', 'old text', 'new text', 'old text'].reduce<Promise<void>>(async (previous, text) => {
    await previous;
    clipboardRead.mockResolvedValue(text);
    await vi.advanceTimersByTimeAsync(1000);
    render();
  }, Promise.resolve());
  expect(render().items.map((item) => item.text)).toEqual(['old text', 'new text']);
  hook.setItems((prev) => prev.slice(0, 1));
  render();
  expect(local.has(LOCAL_STORAGE_KEY)).toBe(true);
  clipboardRead.mockRejectedValue(new Error('clipboard unavailable'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(render().items).toHaveLength(1);
});

it('ignores pending clipboard reads after unmount', async () => {
  const pending = deferred<string>();
  clipboardRead.mockReturnValue(pending.promise);
  render();
  await settleHook();
  unmountHook();
  pending.resolve('late text');
  await settleHook();
  expect(write).not.toHaveBeenCalled();
});

it('uses public textarea refs and normalizes edited text without modifying other rows', async () => {
  let hook = await mount();
  hook.setItems([row(), row(2, 'second text')]);
  hook.adjustTextareaHeight(null);
  const textarea = { style: { height: '' }, scrollHeight: 42 } as HTMLTextAreaElement;
  hook.editTextareaRef.current = textarea;
  hook.handleToggleExpand(row());
  hook = render();
  expect(textarea.style.height).toBe('42px');
  hook.setEditText(' ');
  hook = render();
  hook.handleSaveEdit(1);
  expect(render().items[0]?.text).toBe('old text');
  hook.setEditText('line\r\ntext');
  hook = render();
  hook.handleSaveEdit(1);
  expect(render().items.map((item) => item.text)).toEqual(['line\ntext', 'second text']);
  hook.handleToggleExpand(row());
  expect(render().expandedId).toBeNull();
});

it.each([false, true])('copies the edited or saved text and contains native failures: expanded=%s', async (expanded) => {
  let hook = await mount();
  if (expanded) { hook.handleToggleExpand(row()); hook = render(); hook.setEditText('edited'); hook = render(); }
  hook.handleCopy(row());
  await settleHook();
  expect(clipboardWrite).toHaveBeenLastCalledWith(expanded ? 'edited' : 'old text');
  expect(feedback).toHaveBeenCalledWith('success', 'clipboardHistoryTab.messages.copySuccess');
  clipboardWrite.mockRejectedValue(new Error('write failed'));
  hook.handleCopy(row());
  await settleHook();
  expect(feedback).toHaveBeenLastCalledWith('error', 'clipboardHistoryTab.messages.copyFailed');
});

it.each([false, true])('calls the real island exit action after copy: playing=%s', async (playing) => {
  stored.set(EXIT_MAX_EXPAND_ON_COPY_STORE_KEY, true);
  useIslandStore.setState({ isMusicPlaying: playing });
  const state = useIslandStore.getState();
  const idle = vi.spyOn(state, 'setIdle');
  const lyrics = vi.spyOn(state, 'setLyrics');
  const hook = await mount();
  hook.handleCopy(row());
  await settleHook();
  expect(idle).toHaveBeenCalledTimes(playing ? 0 : 1);
  expect(lyrics).toHaveBeenCalledTimes(playing ? 1 : 0);
});
