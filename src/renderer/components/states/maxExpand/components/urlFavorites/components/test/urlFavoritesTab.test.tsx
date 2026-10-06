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
 * @file urlFavoritesTab.test.tsx
 * @description UrlFavoritesTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { UrlFavoritesTab as Component } from '../UrlFavoritesTab';
import { UrlFavoritesItem } from '../UrlFavoritesItem';
import { UrlFavoritesImportExportPanel } from '../UrlFavoritesImportExportPanel';
import { UrlFavoritesInputBar } from '../UrlFavoritesInputBar';
const state = vi.hoisted(() => ({ favorites: [] as { id: number; url: string }[], visibleFavorites: [] as { id: number; url: string }[], expandedId: 0, handleAdd: vi.fn(), setFolderToolsOpen: vi.fn() }));
vi.mock('../../hooks/useUrlFavorites', () => ({ useUrlFavorites: () => state }));
describe('UrlFavoritesTab', () => {
  it('distinguishes empty favorites from empty filtered folders and maps item state', () => {
    expect(text(render(Component))).toContain('urlFavoritesTab.empty:');
    const item = { id: 1, url: 'https://example.com' };
    state.favorites = [item];
    expect(text(render(Component))).toContain('urlFavoritesTab.folders.emptyFiltered:');
    state.visibleFavorites = [item]; state.expandedId = 1;
    const tree = render(Component);
    expect(value(tree, UrlFavoritesItem, 'isExpanded')).toBe(true);
    expect(value(tree, UrlFavoritesImportExportPanel, 'hasFavorites')).toBe(true);
    expect(value(tree, UrlFavoritesInputBar, 'onAdd')).toBe(state.handleAdd);
    trigger(tree, UrlFavoritesInputBar, 'onToggleFolderTools');
    const update = state.setFolderToolsOpen.mock.calls[0][0] as (old: boolean) => boolean;
    expect(update(false)).toBe(true);
    expect(update(true)).toBe(false);
  });
});
