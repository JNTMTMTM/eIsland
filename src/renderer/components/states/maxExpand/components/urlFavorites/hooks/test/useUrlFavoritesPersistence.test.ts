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
 * @file useUrlFavoritesPersistence.test.ts
 * @description 收藏真实存档迁移、原生事件、网页标题解析去重、焦点恢复与卸载边界测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useUrlFavoritesPersistence } from '../useUrlFavoritesPersistence';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { FOCUS_KEY, LOCAL_STORAGE_KEY, STORE_KEY } from '../../config/urlFavoritesConfig';
import type { UrlFavoriteItem } from '../../types/urlFavoritesTypes';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

const read = vi.fn();
const write = vi.fn();
const net = vi.fn();
const expand = vi.fn<(value: UrlFavoriteItem) => void>();
const focus = vi.fn<(id: number) => void>();
const unsubscribe = vi.fn();
const scroll = vi.fn();
const query = vi.fn();
let listener: (channel: string, value: unknown) => void;
let local: Map<string, string>;
let storage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };
let frames: FrameRequestCallback[];

/** 创建合法持久化收藏数据。
 * @param extra - 场景需要替换的公开字段
 * @returns 收藏条目
 */
function row(extra: Partial<UrlFavoriteItem> = {}): UrlFavoriteItem {
  return { id: 1, url: 'https://one.example', title: 'First', note: 'note', folder: 'Work', createdAt: 1, ...extra };
}

/** 提交真实持久化 Hook 生命周期。
 * @returns 真实公开状态
 */
function render(): ReturnType<typeof useUrlFavoritesPersistence> {
  const hook = renderHook(useUrlFavoritesPersistence, expand, focus);
  flushHookEffects();
  return hook;
}

/** 完成初始化读取并提交更新后的 Effect。
 * @returns 已初始化的公开状态
 */
async function mount(): Promise<ReturnType<typeof useUrlFavoritesPersistence>> {
  render();
  await settleHook();
  render();
  await settleHook();
  return render();
}

beforeEach(() => {
  resetHook();
  read.mockReset().mockResolvedValue([row()]);
  write.mockReset().mockResolvedValue(true);
  net.mockReset().mockResolvedValue({ ok: true, body: '<title>Website &amp; Title</title>' });
  expand.mockReset(); focus.mockReset(); unsubscribe.mockReset(); scroll.mockReset(); query.mockReset().mockReturnValue({ scrollIntoView: scroll });
  local = new Map();
  frames = [];
  storage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => { local.set(key, value); }, removeItem: (key) => { local.delete(key); } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('document', { querySelector: query });
  vi.stubGlobal('window', { api: { storeRead: read, storeWrite: write, netFetch: net, onSettingsChanged: (callback: typeof listener) => { listener = callback; return unsubscribe; } }, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

it('loads native data without echoing it and persists public local edits', async () => {
  let hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.favorites).toEqual([row()]);
  expect(write).not.toHaveBeenCalled();
  hook.setFavorites([row({ note: 'Changed' })]);
  hook = render();
  expect(write).toHaveBeenLastCalledWith(STORE_KEY, hook.favorites);
  expect(JSON.parse(local.get(LOCAL_STORAGE_KEY) ?? '[]')).toEqual(hook.favorites);
});

it.each(['none', 'valid', 'invalid', 'non-array', 'blocked'])('migrates local fallback %s when native data is empty', async (mode) => {
  read.mockResolvedValue([]);
  if (mode === 'valid') local.set(LOCAL_STORAGE_KEY, JSON.stringify([row({ id: 2 })]));
  if (mode === 'invalid') local.set(LOCAL_STORAGE_KEY, '{');
  if (mode === 'non-array') local.set(LOCAL_STORAGE_KEY, '{}');
  if (mode === 'blocked') storage.getItem = () => { throw new Error('blocked'); };
  write.mockRejectedValue(new Error('migration failed'));
  const hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.favorites).toEqual(mode === 'valid' ? [row({ id: 2 })] : []);
});

it.each(['none', 'valid', 'invalid', 'non-array', 'blocked'])('loads local fallback %s when native read rejects', async (mode) => {
  read.mockRejectedValue(new Error('read failed'));
  if (mode === 'valid') local.set(LOCAL_STORAGE_KEY, JSON.stringify([row({ id: 2 })]));
  if (mode === 'invalid') local.set(LOCAL_STORAGE_KEY, '{');
  if (mode === 'non-array') local.set(LOCAL_STORAGE_KEY, '{}');
  if (mode === 'blocked') storage.getItem = () => { throw new Error('blocked'); };
  const hook = await mount();
  expect(hook.loaded).toBe(true);
  expect(hook.favorites).toEqual(mode === 'valid' ? [row({ id: 2 })] : []);
});

it('uses matching native broadcasts without echoing them and ignores stale listeners', async () => {
  await mount();
  listener('unrelated', [row({ id: 2 })]);
  expect(render().favorites[0]?.id).toBe(1);
  listener(`store:${STORE_KEY}`, {});
  expect(render().favorites[0]?.id).toBe(1);
  listener(`store:${STORE_KEY}`, [row({ id: 2 })]);
  expect(render().favorites[0]?.id).toBe(2);
  expect(write).not.toHaveBeenCalled();
  unmountHook();
  listener(`store:${STORE_KEY}`, [row({ id: 3 })]);
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it.each([false, true])('ignores late read completion after unmount: rejected=%s', async (rejected) => {
  const pending = deferred<unknown>();
  read.mockReturnValue(pending.promise);
  render();
  unmountHook();
  if (rejected) pending.reject(new Error('late failure'));
  else pending.resolve([row()]);
  await settleHook();
  expect(expand).not.toHaveBeenCalled();
  expect(focus).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it('parses actual HTML titles and avoids duplicate requests during an in-flight resolution', async () => {
  const pending = deferred<{ ok: boolean; body: string }>();
  net.mockReturnValue(pending.promise);
  read.mockResolvedValue([row({ title: 'https://one.example' }), row({ id: 2, url: 'https://two.example' })]);
  let hook = await mount();
  expect(net).toHaveBeenCalledTimes(1);
  hook.setFavorites((prev) => [...prev]);
  render();
  expect(net).toHaveBeenCalledTimes(1);
  pending.resolve({ ok: true, body: '<title>Resolved &amp; Title</title>' });
  await settleHook();
  hook = render();
  expect(hook.favorites.map((item) => item.title)).toEqual(['Resolved & Title', 'First']);
});

it.each(['empty', 'rejected'])('retains unresolved items for a real empty title response: %s', async (mode) => {
  read.mockResolvedValue([row({ title: 'https://one.example' })]);
  if (mode === 'rejected') net.mockRejectedValue(new Error('network failed'));
  else net.mockResolvedValue({ ok: true, body: '<html>No title</html>' });
  await mount();
  expect(render().favorites[0]?.title).toBe('https://one.example');
});

it.each(['none', 'unmatched', 'matched', 'blocked', 'remove-failed', 'element-missing'])('restores focus through actual normalized URL matching: %s', async (mode) => {
  if (mode === 'unmatched') local.set(FOCUS_KEY, 'missing.example');
  if (['matched', 'remove-failed', 'element-missing'].includes(mode)) local.set(FOCUS_KEY, 'ONE.EXAMPLE');
  if (mode === 'blocked') storage.getItem = () => { throw new Error('blocked'); };
  if (mode === 'remove-failed') storage.removeItem = () => { throw new Error('blocked'); };
  if (mode === 'element-missing') query.mockReturnValue(null);
  await mount();
  const matched = ['matched', 'remove-failed', 'element-missing'].includes(mode);
  expect(expand).toHaveBeenCalledTimes(matched ? 1 : 0);
  expect(focus).toHaveBeenCalledTimes(matched ? 1 : 0);
  frames.forEach((callback) => callback(0));
  expect(scroll).toHaveBeenCalledTimes(matched && mode !== 'element-missing' ? 1 : 0);
});
