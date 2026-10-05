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
 * @file urlFavoritesFolderPanel.test.tsx
 * @description UrlFavoritesFolderPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { UrlFavoritesFolderPanel as Component } from '../UrlFavoritesFolderPanel';

describe('UrlFavoritesFolderPanel', () => {
  const props = { folderToolsOpen: false, folders: ['Work'], activeFolder: '', setActiveFolder: vi.fn(), newFolderInput: '', setNewFolderInput: vi.fn(), onCreateFolder: vi.fn(), onClearFolder: vi.fn() };
  it('selects all or a folder and shows clear only for the active folder', () => {
    const tree = render(Component, props);
    expect(nodes(tree, '.url-favorites-folder-clear')).toHaveLength(0);
    trigger(tree, '.url-favorites-folder-chip', 'onClick');
    (value(tree, '.url-favorites-folder-chip', 'onClick', 1) as () => void)();
    expect(props.setActiveFolder.mock.calls).toEqual([[''], ['Work']]);
    const opened = render(Component, { ...props, activeFolder: 'Work', folderToolsOpen: true });
    expect(nodes(opened, '.url-favorites-folder-bar--open')).toHaveLength(1);
    trigger(opened, '.url-favorites-folder-clear', 'onClick');
    expect(props.onClearFolder).toHaveBeenCalledWith('Work');
  });
  it('updates a new folder draft and creates with Enter', () => {
    const tree = render(Component, props);
    trigger(tree, 'input', 'onChange', { target: { value: 'New' } });
    trigger(tree, 'input', 'onKeyDown', { key: 'Enter', preventDefault: vi.fn() });
    expect(props.setNewFolderInput).toHaveBeenCalledWith('New');
    expect(props.onCreateFolder).toHaveBeenCalledOnce();
  });
});
