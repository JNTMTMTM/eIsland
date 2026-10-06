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
 * @file clipboardHistoryLifecycle.test.tsx
 * @description 剪贴板主组件真实 Hook、原生持久化、导出和反馈生命周期集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ClipboardHistoryTab } from '../ClipboardHistoryTab';
import { ClipboardHistoryHeader } from '../ClipboardHistoryHeader';
import { ClipboardHistoryItemRow } from '../ClipboardHistoryItemRow';
import useIslandStore from '../../../../../../../store/slices';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { FEEDBACK_DURATION_MS, HISTORY_ENABLED_STORE_KEY, STORE_KEY } from '../../config/clipboardHistoryConfig';
import type { ReactElement } from 'react';
import type { ClipboardHistoryItem } from '../../types/clipboardHistoryTypes';

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

// 只桥接实际 Zustand 的 React 订阅，真实 actions、配置和存储逻辑完整执行。
vi.mock('../../../../../../../store/slices', async (original) => {
  const actual = await original<typeof import('../../../../../../../store/slices')>();
  const store = actual.default;
  return { ...actual, default: Object.assign(() => store.getState(), store) };
});

const snapshot = useIslandStore.getState();
const read = vi.fn<(key: string) => Promise<unknown>>();
const write = vi.fn<(key: string, value: unknown) => Promise<boolean>>();
const copy = vi.fn<(value: string) => Promise<boolean>>();
const click = vi.fn<() => void>();
const remove = vi.fn<() => void>();
const append = vi.fn<(value: unknown) => void>();
const anchor = { click, remove, href: '', download: '', style: { display: '' } };
const revoke = vi.fn<(url: string) => void>();
const createElement = vi.fn<(tag: string) => typeof anchor>();
let stored: Map<string, unknown>;
let exportedBlob: Blob | null = null;

/** 提交真实组件的 Hook 生命周期。
 * @returns 当前实际元素树
 */
function view(): ReactElement {
  const tree = renderHook(ClipboardHistoryTab);
  flushHookEffects();
  return tree;
}

/** 等待原生存档读取并提交各实际 Hook。
 * @returns 已加载的组件元素树
 */
async function mount(): Promise<ReactElement> {
  view();
  await settleHook();
  view();
  await settleHook();
  return view();
}

/** 创建合法存档输入。
 * @param id - 业务 ID
 * @param content - 实际剪贴板文本
 * @returns 原生存档条目
 */
function row(id: number, content: string): ClipboardHistoryItem {
  return { id, text: content, createdAt: 1 };
}

beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5, 12));
  useIslandStore.setState(snapshot, true);
  stored = new Map<string, unknown>([[STORE_KEY, [row(1, 'first text'), row(2, 'https://example.com'), row(3, 'third text')]], [HISTORY_ENABLED_STORE_KEY, false]]);
  read.mockReset().mockImplementation((key) => Promise.resolve(stored.get(key)));
  write.mockReset().mockResolvedValue(true);
  copy.mockReset().mockResolvedValue(true);
  click.mockReset();
  remove.mockReset();
  append.mockReset();
  createElement.mockReset().mockReturnValue(anchor);
  exportedBlob = null;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    if (!(blob instanceof Blob)) throw new TypeError('Export requires Blob');
    exportedBlob = blob;
    return 'blob:clipboard-export';
  });
  revoke.mockReset();
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('document', { createElement, body: { appendChild: append } });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout, setInterval, clearInterval, api: {
    storeRead: read, storeWrite: write, clipboardReadText: () => Promise.resolve(''), clipboardWriteText: copy,
  } }));
});

afterEach(() => {
  unmountHook();
  useIslandStore.setState(snapshot, true);
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('真实删除回调保留其他条目，并在删除展开条目时结束编辑', async () => {
  let tree = await mount();
  let rows = elements(tree).filter((node) => node.type === ClipboardHistoryItemRow);
  invoke(rows[1], 'onRemove', 2);
  tree = view();
  rows = elements(tree).filter((node) => node.type === ClipboardHistoryItemRow);
  expect(rows.map((node) => node.props.item)).toEqual([row(1, 'first text'), row(3, 'third text')]);
  invoke(rows[0], 'onToggleExpand', rows[0].props.item);
  tree = view();
  expect(find(tree, (node) => node.type === ClipboardHistoryItemRow).props.expanded).toBe(true);
  invoke(find(tree, (node) => node.type === ClipboardHistoryItemRow), 'onRemove', 1);
  tree = view();
  const remaining = find(tree, (node) => node.type === ClipboardHistoryItemRow);
  expect(remaining.props.item).toEqual(row(3, 'third text'));
  expect(remaining.props.expanded).toBe(false);
  expect(remaining.props.editText).toBe('');
  expect(write).toHaveBeenLastCalledWith(STORE_KEY, [row(3, 'third text')]);
});

it('公开筛选和选择回调以真实导出 helper 只导出选择范围', async () => {
  let tree = await mount();
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onFilterChange', 'url');
  tree = view();
  expect(find(tree, (node) => node.type === ClipboardHistoryHeader).props).toMatchObject({ countLabel: 'clipboardHistoryTab.filteredCount', visibleCount: 1, totalCount: 3 });
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onFilterChange', 'all');
  tree = view();
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onToggleSelectionMode');
  tree = view();
  invoke(find(tree, (node) => node.type === ClipboardHistoryItemRow), 'onToggleSelect', 1);
  tree = view();
  expect(find(tree, (node) => node.type === ClipboardHistoryHeader).props.exportCount).toBe(1);
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onExport');
  expect(exportedBlob).not.toBeNull();
  const payload = JSON.parse(await exportedBlob!.text()) as { count: number; items: ClipboardHistoryItem[] };
  expect(payload.count).toBe(1);
  expect(payload.items).toMatchObject([row(1, 'first text')]);
  expect(anchor.download).toBe('eIsland-clipboard-history-20261005-120000.json');
  expect(click).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
  expect(revoke).toHaveBeenCalledWith('blob:clipboard-export');
  expect(text(byClass(view(), 'clipboard-history-feedback'))).toBe('clipboardHistoryTab.messages.exportSuccess');
});

it('空列表不建立下载，原生下载失败显示可重试反馈，重试成功后按时清除', async () => {
  let tree = view();
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onExport');
  expect(createElement).not.toHaveBeenCalled();
  await settleHook();
  tree = view();
  createElement.mockImplementationOnce(() => { throw new Error('native document blocked'); });
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onExport');
  expect(text(byClass(view(), 'clipboard-history-feedback--error'))).toBe('clipboardHistoryTab.messages.exportFailed');
  tree = view();
  invoke(find(tree, (node) => node.type === ClipboardHistoryHeader), 'onExport');
  expect(text(byClass(view(), 'clipboard-history-feedback--success'))).toBe('clipboardHistoryTab.messages.exportSuccess');
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(FEEDBACK_DURATION_MS);
  expect(elements(view()).some((node) => node.props.className === 'clipboard-history-feedback')).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it('列表滚轮由真实事件回调停止向外部导航传播', async () => {
  const tree = await mount();
  const event = { stopPropagation: vi.fn<() => void>() };
  invoke(byClass(tree, 'clipboard-history-list'), 'onWheelCapture', event);
  expect(event.stopPropagation).toHaveBeenCalledOnce();
});
