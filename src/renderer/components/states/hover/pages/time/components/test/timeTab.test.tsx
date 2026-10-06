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
 * @file timeTab.test.tsx
 * @description TimeTab 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { find, invoke, text } from '../../../../../test/tree';

import { TimeTab } from '../TimeTab';

import { MediaButtons } from '../MediaButtons';
import { CountdownEdit } from '../CountdownEdit';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('../../../../../../../store/slices', () => ({ default: vi.fn() }));
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function render() { slots.cursor = 0; return ((TimeTab({ fullTimeStr: '12:34:56', lunarStr: 'Lunar day' }) as TreeElement)); }
describe('TimeTab', () => {
  it('renders supplied clock and lunar date alongside countdown', () => { const root = render(); expect(text(root)).toContain('12:34:56'); expect(text(root)).toContain('Lunar day'); expect(find(root, (node) => node.type === CountdownEdit).props.activePanel).toBe('countdown'); });
  it.each(['brightness', 'volume'])('opens %s then toggles back to countdown', (panel) => { invoke(find(render(), (node) => node.type === MediaButtons), 'onPanelToggle', panel); expect(find(render(), (node) => node.type === CountdownEdit).props.activePanel).toBe(panel); invoke(find(render(), (node) => node.type === MediaButtons), 'onPanelToggle', panel); expect(find(render(), (node) => node.type === CountdownEdit).props.activePanel).toBe('countdown'); });
});
