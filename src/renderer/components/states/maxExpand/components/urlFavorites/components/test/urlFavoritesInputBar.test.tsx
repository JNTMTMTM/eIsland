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
 * @file urlFavoritesInputBar.test.tsx
 * @description UrlFavoritesInputBar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { UrlFavoritesInputBar as Component } from '../UrlFavoritesInputBar';

describe('UrlFavoritesInputBar', () => {
  it('forwards input, adds only for Enter and exposes panel toggles', () => {
    const props = { urlInput: '', setUrlInput: vi.fn(), placeholder: 'URL', onAdd: vi.fn(), folderToolsOpen: false, onToggleFolderTools: vi.fn(), importExportOpen: true, onToggleImportExport: vi.fn() };
    const tree = render(Component, props);
    expect(value(tree, 'input', 'placeholder')).toBe('URL');
    trigger(tree, 'input', 'onChange', { target: { value: 'https://example.com' } });
    trigger(tree, 'input', 'onKeyDown', { key: 'Escape', preventDefault: vi.fn() });
    expect(props.onAdd).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onKeyDown', { key: 'Enter', preventDefault: vi.fn() });
    trigger(tree, '.url-favorites-add', 'onClick');
    expect(props.onAdd).toHaveBeenCalledTimes(2);
    expect(props.setUrlInput).toHaveBeenCalledWith('https://example.com');
    trigger(tree, '.url-favorites-tool-toggle', 'onClick');
    trigger(tree, '.url-favorites-manage', 'onClick');
    expect(props.onToggleFolderTools).toHaveBeenCalledOnce();
    expect(props.onToggleImportExport).toHaveBeenCalledOnce();
    expect(value(tree, '.url-favorites-manage', 'aria-expanded')).toBe(true);
  });
});
