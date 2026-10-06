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
 * @file urlFavoritesLifecycle.test.tsx
 * @description URL 收藏主组件与真实持久化、编辑、分类 Hook 的公共事件集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UrlFavoritesTab } from '../UrlFavoritesTab';
import { UrlFavoritesInputBar } from '../UrlFavoritesInputBar';
import { UrlFavoritesFolderPanel } from '../UrlFavoritesFolderPanel';
import { UrlFavoritesImportExportPanel } from '../UrlFavoritesImportExportPanel';
import { UrlFavoritesItem } from '../UrlFavoritesItem';
import { elements, find, byClass, invoke, text } from '../../../../../test/tree';
import { resetHook, renderHook, flushHookEffects, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ReactElement } from 'react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

const read = vi.fn();
const write = vi.fn();
const unsubscribe = vi.fn();
beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  read.mockResolvedValue([{ id: 1, url: 'https://example.com', title: 'Example', note: '', folder: 'Work', createdAt: 1 }]);
  write.mockResolvedValue(true);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api: { storeRead: read, storeWrite: write, onSettingsChanged: () => unsubscribe } });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

/** 提交真实组件及其全部真实子 Hook 生命周期。
 * @returns 本次真实 React 元素树。
 */
function render(): ReactElement {
  const tree = renderHook(UrlFavoritesTab);
  flushHookEffects();
  return tree;
}

it('原生缓存加载后，组件切换按钮、编辑项和滚轮均调用真实接线', async () => {
  expect(text(render())).toContain('urlFavoritesTab.empty');
  await settleHook();
  let tree = render();
  const inputs = find(tree, (node) => node.type === UrlFavoritesInputBar);
  invoke(inputs, 'onToggleFolderTools');
  invoke(inputs, 'onToggleImportExport');
  tree = render();
  expect(find(tree, (node) => node.type === UrlFavoritesFolderPanel).props.folderToolsOpen).toBe(true);
  expect(find(tree, (node) => node.type === UrlFavoritesImportExportPanel).props.importExportOpen).toBe(true);
  invoke(find(tree, (node) => node.type === UrlFavoritesInputBar), 'onToggleFolderTools');
  invoke(find(tree, (node) => node.type === UrlFavoritesInputBar), 'onToggleImportExport');
  tree = render();
  expect(find(tree, (node) => node.type === UrlFavoritesInputBar).props.folderToolsOpen).toBe(false);
  expect(find(tree, (node) => node.type === UrlFavoritesImportExportPanel).props.importExportOpen).toBe(false);
  const item = find(tree, (node) => node.type === UrlFavoritesItem);
  invoke(item, 'onToggleExpand', item.props.item);
  tree = render();
  expect(find(tree, (node) => node.type === UrlFavoritesItem).props.isExpanded).toBe(true);
  const stopPropagation = vi.fn();
  invoke(byClass(tree, 'url-favorites-list'), 'onWheelCapture', { stopPropagation });
  expect(stopPropagation).toHaveBeenCalledOnce();
  invoke(find(tree, (node) => node.type === UrlFavoritesFolderPanel), 'setActiveFolder', 'Missing');
  tree = render();
  expect(text(tree)).toContain('urlFavoritesTab.folders.emptyFiltered');
  expect(elements(tree).filter((node) => node.type === UrlFavoritesItem)).toHaveLength(0);
  unmountHook();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('真实主进程旧缓存中含 null 和原始值仍加载合法收藏', async () => {
  const valid = { id: 1, url: 'https://example.com', title: 'Example', note: '', folder: 'Work', createdAt: 1 };
  read.mockResolvedValue([null, false, 3, 'bad', valid]);
  render();
  await settleHook();
  const tree = render();
  expect(find(tree, (node) => node.type === UrlFavoritesItem).props.item).toMatchObject({ ...valid, note: 'Example' });
  expect(elements(tree).filter((node) => node.type === UrlFavoritesItem)).toHaveLength(1);
});
