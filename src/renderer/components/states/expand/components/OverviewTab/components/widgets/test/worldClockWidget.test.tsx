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
 * @file worldClockWidget.test.tsx
 * @description WorldClockWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, find, invoke, text } from '../../../../../../test/tree';

import { WorldClockWidget } from '../WorldClockWidget';
import type { TreeElement } from '../../../../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ config: { timezones: ['Asia/Shanghai'] } }));
vi.mock('../../../../../../maxExpand/components/worldClock/hooks/useOverviewWorldClockConfig', () => ({ useOverviewWorldClockConfig: () => [model.config] }));
describe('WorldClockWidget', () => {
  it('renders empty clocks before the first tick and supports keyboard navigation', () => { const open = vi.fn(); const root = ((WorldClockWidget({ onOpenWorldClockPage: open }) as TreeElement)); expect(text(root)).toContain('overview.worldClock.empty'); const title = byClass(root, 'ov-dash-widget-title'); invoke(title, 'onClick'); ['Enter', ' '].forEach((key) => { const preventDefault = vi.fn(); invoke(title, 'onKeyDown', { key, preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); }); invoke(title, 'onKeyDown', { key: 'Escape', preventDefault: vi.fn() }); expect(open).toHaveBeenCalledTimes(3); });
  it('renders formatted city clock ticks', () => { slots.values = [[{ timezone: 'Asia/Shanghai', label: 'Shanghai', formattedTime: '12:34:56', countryCode: 'CN' }]]; const root = ((WorldClockWidget({ onOpenWorldClockPage: vi.fn() }) as TreeElement)); expect(text(root)).toContain('12:34:56'); expect(find(root, (node) => node.props.countryCode === 'CN')).toBeDefined(); });
});
