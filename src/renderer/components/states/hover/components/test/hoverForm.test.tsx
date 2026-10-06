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
 * @file hoverForm.test.tsx
 * @description HoverForm 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, find, invoke, translate } from '../../../test/tree';

import { HoverForm } from '../HoverForm';

import { TimeTab } from '../../pages/time';
import { LyricsTab } from '../../pages/lyric';
import { WeatherTab } from '../../pages/weather';
import type { TreeElement } from '../../../test/tree';
vi.mock('../../../../../store/slices', () => ({ default: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
function fixture(hoverTab: string) { return { hoverTab, fullTimeStr: 'Time', lunarStr: 'Lunar', t: translate, setHoverTab: vi.fn<(tab: string) => void>(), setExpanded: vi.fn(), contentRef: { current: null }, getDotLabel: (tab: string) => tab }; }
function render(props: ReturnType<typeof fixture>) { return ((HoverForm(props as unknown as Parameters<typeof HoverForm>[0]) as TreeElement)); }
describe('HoverForm', () => {
  it.each([['time', TimeTab], ['lyrics', LyricsTab], ['weather', WeatherTab]] as const)('renders only selected %s page', (tab, type) => { const root = render(fixture(tab)); expect(find(root, (node) => node.type === type)).toBeDefined(); expect(elements(root).filter((node) => [TimeTab, LyricsTab, WeatherTab].includes(node.type as typeof TimeTab))).toHaveLength(1); });
  it('delegates page switching and the expand dot while stopping propagation', () => { const props = fixture('time'); const root = render(props); const stopPropagation = vi.fn(); const dots = elements(root).filter((node) => node.type === 'button'); dots.forEach((dot) => invoke(dot, 'onClick', { stopPropagation })); expect(props.setExpanded).toHaveBeenCalledOnce(); expect(props.setHoverTab.mock.calls.map((call) => call[0])).toEqual(['time', 'lyrics', 'weather']); expect(stopPropagation).toHaveBeenCalledTimes(dots.length); });
});
