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
 * @file urlFavoritesWidget.test.tsx
 * @description UrlFavoritesWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../../../../test/tree';

import { UrlFavoritesWidget } from '../UrlFavoritesWidget';
import type { TreeElement } from '../../../../../../test/tree';
const api = { clipboardOpenUrl: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function render(openUrlFavoritesPage = vi.fn()) { slots.cursor = 0; return ((UrlFavoritesWidget({ openUrlFavoritesPage }) as TreeElement)); }
beforeEach(() => { vi.stubGlobal('window', { api }); });
describe('UrlFavoritesWidget', () => {
  it('renders empty state and forwards page link', () => { const open = vi.fn(); const root = render(open); expect(text(root)).toContain('overview.urlFavorites.empty'); invoke(byClass(root, 'ov-dash-widget-title'), 'onClick'); expect(open).toHaveBeenCalledOnce(); });
  it('caps displayed favorites at five and provides view-all navigation', () => { slots.values = [[0, 1, 2, 3, 4, 5].map((id) => ({ id, url: `https://example.com/${id}`, title: `Title${id}`, note: id === 0 ? 'Note' : '', createdAt: 1 }))]; const open = vi.fn(); const root = render(open); const items = elements(root).filter((node) => node.props.className === 'ov-dash-url-favorites-item'); expect(items).toHaveLength(5); expect(text(root)).toContain('Note'); invoke(items[0], 'onClick'); expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://example.com/0'); invoke(byClass(root, 'ov-dash-url-favorites-more'), 'onClick'); expect(open).toHaveBeenCalledOnce(); });
  it('uses URL as title fallback and replaces broken favicon', () => { slots.values = [[{ id: 1, url: 'https://example.com', title: '', note: '', createdAt: 1 }]]; const root = render(); expect(text(root)).toContain('https://example.com'); const target = { src: '' }; invoke(byClass(root, 'ov-dash-url-favorites-favicon'), 'onError', { target }); expect(target.src).toContain('LINK.svg'); });
});
