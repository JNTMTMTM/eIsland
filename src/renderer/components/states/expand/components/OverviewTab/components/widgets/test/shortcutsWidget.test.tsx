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
 * @file shortcutsWidget.test.tsx
 * @description ShortcutsWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../../../../test/tree';

import { ShortcutsWidget } from '../ShortcutsWidget';
import type { TreeElement } from '../../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

const model = vi.hoisted(() => ({ setExpandTab: vi.fn() }));
vi.mock('../../../../../../../../store/slices', () => ({ default: () => model }));
function fixture() { return { apps: [{ id: 1, name: 'Editor', path: 'editor.exe', iconBase64: 'base64' }, { id: 2, name: 'Browser', path: 'browser.exe', iconBase64: null }], dragIndex: 0, dragOverIndex: 1, onOpenApp: vi.fn(), onDragStart: vi.fn(), onDragOver: vi.fn(), onDrop: vi.fn(), onDragEnd: vi.fn() }; }
describe('ShortcutsWidget', () => {
  it('renders app icons, drag state and forwards each drag operation', () => { const props = fixture(); const root = ((ShortcutsWidget(props) as TreeElement)); const items = elements(root).filter((node) => String(node.props.className).startsWith('ov-dash-app-item')); expect(items[0].props.className).toContain('dragging'); expect(items[1].props.className).toContain('drag-over'); expect(byClass(root, 'ov-dash-app-icon').props.src).toBe('data:image/png;base64,base64'); expect(byClass(root, 'ov-dash-app-icon-placeholder')).toBeDefined(); invoke(items[0], 'onClick'); expect(props.onOpenApp).toHaveBeenCalledWith('editor.exe'); const event = {}; invoke(items[1], 'onDragStart', event); invoke(items[1], 'onDragOver', event); invoke(items[1], 'onDrop', event); invoke(items[1], 'onDragEnd'); expect(props.onDragStart).toHaveBeenCalledWith(event, 1); expect(props.onDragOver).toHaveBeenCalledWith(event, 1); expect(props.onDrop).toHaveBeenCalledWith(event, 1); expect(props.onDragEnd).toHaveBeenCalledOnce(); });
  it('renders empty shortcuts and opens edit page', () => { const props = fixture(); props.apps = []; const root = ((ShortcutsWidget(props) as TreeElement)); expect(text(root)).toContain('overview.shortcuts.emptyHint'); invoke(byClass(root, 'ov-dash-apps-title'), 'onClick'); expect(model.setExpandTab).toHaveBeenCalledWith('tools'); });
});
