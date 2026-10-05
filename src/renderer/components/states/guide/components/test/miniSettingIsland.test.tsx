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
 * @file miniSettingIsland.test.tsx
 * @description MiniSettingIsland 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../test/tree';

import { MiniSettingIsland } from '../MiniSettingIsland';
import type { TreeElement } from '../../../test/tree';
const api = { islandOpacitySet: vi.fn().mockResolvedValue(true), setIslandPositionOffset: vi.fn().mockResolvedValue(true), autostartSet: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ applyTheme: vi.fn() }));
vi.mock('../../../../../utils/theme', () => ({ getThemeMode: () => 'dark', setThemeMode: model.applyTheme }));
vi.mock('../../../../../i18n', () => ({ default: { t: (key: string) => key } }));
function render(demo: Parameters<typeof MiniSettingIsland>[0]['demo']) { slots.cursor = 0; return ((MiniSettingIsland({ demo }) as TreeElement)); }
beforeEach(() => { vi.stubGlobal('window', { api }); vi.stubGlobal('document', { documentElement: { style: { setProperty: vi.fn() } } }); });
describe('MiniSettingIsland', () => {
  it('switches real theme setting and selected preview', () => { const root = render('theme'); const buttons = elements(root).filter((node) => node.type === 'button'); invoke(buttons[1], 'onClick'); expect(model.applyTheme).toHaveBeenCalledWith('light'); expect(byClass(render('theme'), 'ms-theme-preview').props.className).toContain('ms-theme-light'); });
  it('clamps opacity to supported boundaries and persists the value', () => { slots.values = ['dark', 10]; let root = render('opacity'); invoke(elements(root).filter((node) => node.type === 'button')[0], 'onClick'); expect(api.islandOpacitySet).toHaveBeenLastCalledWith(10); slots.values[1] = 100; root = render('opacity'); invoke(elements(root).filter((node) => node.type === 'button')[3], 'onClick'); expect(api.islandOpacitySet).toHaveBeenLastCalledWith(100); expect(text(render('opacity'))).toContain('100%'); });
  it('moves position and provides reset control', () => { slots.values = ['dark', 100, { x: 20, y: 10 }]; const root = render('position'); invoke(byClass(root, 'ms-ctrl-reset'), 'onClick'); expect(api.setIslandPositionOffset).toHaveBeenCalledWith({ x: 0, y: 0 }); expect(text(render('position'))).toContain('x:0 y:0'); });
  it('switches autostart priority and marks enabled indicator', () => { const root = render('autostart'); invoke(elements(root).filter((node) => node.type === 'button')[2], 'onClick'); expect(api.autostartSet).toHaveBeenCalledWith('high-priority'); expect(byClass(render('autostart'), 'ms-autostart-indicator').props.className).toContain('elevated'); });
  it('renders shortcut reference without setting controls', () => { const root = render('shortcut'); expect(elements(root).filter((node) => node.type === 'button')).toHaveLength(0); expect(elements(root).filter((node) => node.type === 'kbd')).toHaveLength(10); });
});
