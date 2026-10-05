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
 * @file miniIsland.test.tsx
 * @description MiniIsland 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, invoke } from '../../../test/tree';

import { MiniIsland } from '../MiniIsland';
import type { TreeElement } from '../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function render(demo: Parameters<typeof MiniIsland>[0]['demo']) { slots.cursor = 0; return ((MiniIsland({ demo }) as TreeElement)); }
describe('MiniIsland', () => {
  it.each(['hover', 'click', 'scroll', 'retract'] as const)('starts %s at the configured state', (demo) => { const root = render(demo); expect(byClass(root, 'mini-island').props.className).toContain(`mini-island-${{ retract: 'expanded', click: 'hover', hover: 'idle', scroll: 'idle' }[demo]}`); });
  it('expands on hover and restores idle on leaving', () => { const root = render('hover'); invoke(byClass(root, 'mini-island'), 'onMouseEnter'); expect(byClass(render('hover'), 'mini-island').props.className).toContain('mini-island-hover'); invoke(byClass(render('hover'), 'mini-island'), 'onMouseLeave'); expect(byClass(render('hover'), 'mini-island').props.className).toContain('mini-island-idle'); });
  it('expands click demo and retracts after its demonstration delay', () => { vi.useFakeTimers(); const root = render('click'); const stopPropagation = vi.fn(); invoke(byClass(root, 'mini-island'), 'onClick', { stopPropagation }); expect(stopPropagation).toHaveBeenCalledOnce(); expect(byClass(render('click'), 'mini-island').props.className).toContain('mini-island-expanded'); vi.advanceTimersByTime(1500); expect(byClass(render('click'), 'mini-island').props.className).toContain('mini-island-hover'); });
  it('defers retraction for 600 milliseconds', () => { vi.useFakeTimers(); invoke(byClass(render('retract'), 'mini-island'), 'onMouseLeave'); vi.advanceTimersByTime(599); expect(slots.values[0]).toBe('expanded'); vi.advanceTimersByTime(1); expect(slots.values[0]).toBe('idle'); });
});
