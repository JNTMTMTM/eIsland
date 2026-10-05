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
 * @file breakReminderWidget.test.tsx
 * @description BreakReminderWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../../../../test/tree';

import { BreakReminderWidget } from '../BreakReminderWidget';
import type { TreeElement } from '../../../../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function render(openBreakReminderPage = vi.fn()) { slots.cursor = 0; return ((BreakReminderWidget({ openBreakReminderPage }) as TreeElement)); }
describe('BreakReminderWidget', () => {
  it('renders empty reminders and forwards navigation', () => { const open = vi.fn(); const root = render(open); expect(text(root)).toContain('overview.breakReminder.empty'); invoke(byClass(root, 'ov-dash-widget-title'), 'onClick'); expect(open).toHaveBeenCalledOnce(); });
  it('filters disabled, unnamed and invalid intervals', () => { slots.values = [[{ id: 'a', name: 'Break', intervalMinutes: 5, enabled: true }, { id: 'b', name: 'Disabled', intervalMinutes: 5, enabled: false }, { id: 'c', name: '', intervalMinutes: 5, enabled: true }, { id: 'd', name: 'Invalid', intervalMinutes: 0, enabled: true }], {}, 1000000]; expect(elements(render()).filter((node) => node.props.className === 'ov-dash-break-reminder-item')).toHaveLength(1); });
  it('renders elapsed progress and due state at boundary', () => { slots.values = [[{ id: 'a', name: 'Break', intervalMinutes: 5, enabled: true }], { a: 700000 }, 1000000]; const root = render(); expect(text(root)).toContain('overview.breakReminder.due'); expect(byClass(root, 'ov-dash-break-reminder-bar-fill').props.style).toEqual({ width: '100%' }); slots.values[2] = 850000; expect(byClass(render(), 'ov-dash-break-reminder-bar-fill').props.style).toEqual({ width: '50%' }); });
});
