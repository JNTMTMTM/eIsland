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
 * @file urlFavoritesImportExportPanel.test.tsx
 * @description UrlFavoritesImportExportPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { UrlFavoritesImportExportPanel as Component } from '../UrlFavoritesImportExportPanel';

describe('UrlFavoritesImportExportPanel', () => {
  const props = { importExportOpen: true, importFormat: 'json', exportFormat: 'html', setImportFormat: vi.fn(), setExportFormat: vi.fn(), onImportClick: vi.fn(), onImportFile: vi.fn(), onExport: vi.fn(), hasFavorites: false };
  it('switches accepted file formats and handles a cleared file picker', () => {
    const tree = render(Component, props);
    expect(value(tree, 'input', 'accept')).toBe('.json,application/json');
    trigger(tree, 'input', 'onChange', { target: { files: null } });
    expect(props.onImportFile).toHaveBeenCalledWith(null);
    const file = { name: 'bookmarks.json' };
    trigger(tree, 'input', 'onChange', { target: { files: [file] } });
    expect(props.onImportFile).toHaveBeenLastCalledWith(file);
    const html = render(Component, { ...props, importFormat: 'html' });
    expect(value(html, 'input', 'accept')).toBe('.html,.htm,text/html');
  });
  it('updates independent format controls and disables export for no favorites', () => {
    const tree = render(Component, props);
    expect(value(tree, '.url-favorites-secondary-action', 'disabled', 1)).toBe(true);
    const formats = nodes(tree, '.url-favorites-format-btn');
    formats.forEach((button) => (button.props.onClick as () => void)());
    expect(props.setImportFormat.mock.calls).toEqual([['json'], ['html']]);
    expect(props.setExportFormat.mock.calls).toEqual([['json'], ['html']]);
    trigger(tree, '.url-favorites-secondary-action', 'onClick');
    expect(props.onImportClick).toHaveBeenCalledOnce();
    expect(value(render(Component, { ...props, hasFavorites: true }), '.url-favorites-secondary-action', 'disabled', 1)).toBe(false);
    expect(value(render(Component, { ...props, importExportOpen: false }), '.url-favorites-import-export-panel', 'className')).toBe('url-favorites-import-export-panel');
  });
});
