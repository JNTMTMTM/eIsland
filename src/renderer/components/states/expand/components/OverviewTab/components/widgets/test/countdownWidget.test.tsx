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
 * @file countdownWidget.test.tsx
 * @description CountdownWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../../../../test/tree';

import { CountdownWidget } from '../CountdownWidget';

import { CountdownCard } from '../../../../../../maxExpand/components/countdown/components/CountdownCard';
import type { TreeElement } from '../../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
const model = vi.hoisted(() => ({ items: [] as Array<{ id: number; name: string; date: string; color: string; type: string; pinned?: boolean; archived?: boolean }>, loaded: true, error: null as string | null }));
vi.mock('../../../../../../maxExpand/components/countdown/hooks/useCountdownItems', () => ({ useCountdownItems: () => model }));
vi.mock('../../../../../../maxExpand/components/countdown/hooks/useCountdownToday', () => ({ useCountdownToday: () => new Date('2026-10-06T00:00:00') }));
beforeEach(() => { model.items = []; model.loaded = true; model.error = null; });
describe('CountdownWidget', () => {
  it.each([['new', true, null], ['loading', false, null], ['saveError', true, 'error']] as const)('renders empty %s state', (key, loaded, error) => { model.loaded = loaded; model.error = error; const openTargetPage = vi.fn(); const root = ((CountdownWidget({ openTargetPage }) as TreeElement)); expect(text(root)).toContain(`countdown.manage.${key}`); invoke(byClass(root, 'ov-dash-countdown-empty'), 'onClick'); expect(openTargetPage).toHaveBeenCalledWith('countdown'); });
  it('filters archived events, caps visible cards and opens management', () => { model.items = [1, 2, 3, 4].map((id) => ({ id, name: `Event${id}`, date: '2026-12-01', color: '#fff', type: 'countdown', archived: id === 4 })); const openTargetPage = vi.fn(); const root = ((CountdownWidget({ openTargetPage }) as TreeElement)); const cards = elements(root).filter((node) => node.type === CountdownCard); expect(cards).toHaveLength(2); expect(cards.every((node) => node.props.compact === true)).toBe(true); invoke(cards[0], 'onClick'); expect(openTargetPage).toHaveBeenCalledWith('countdown'); });
});
