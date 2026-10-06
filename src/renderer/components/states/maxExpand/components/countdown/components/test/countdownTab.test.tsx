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
 * @file countdownTab.test.tsx
 * @description CountdownTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { CountdownTab as Component } from '../CountdownTab';
import { CountdownCardList } from '../CountdownCardList';
const state = vi.hoisted(() => ({ loaded: false, saving: false, error: '', items: [] as { id: number; name: string; type: string; date: string }[], updateItems: vi.fn() }));
const form = vi.hoisted(() => ({ open: false, editingId: null, draft: { date: '2026-10-06' }, startNew: vi.fn(), setOpen: vi.fn() }));
vi.mock('../../hooks/useCountdownItems', () => ({ useCountdownItems: () => state }));
vi.mock('../../hooks/useCountdownForm', () => ({ useCountdownForm: () => form }));
vi.mock('../../hooks/useCountdownToday', () => ({ useCountdownToday: () => new Date(2026, 9, 6) }));
vi.mock('../../../../../../../store/slices', () => ({ default: () => null }));
describe('CountdownTab', () => {
  it('shows loading and save errors, then filters loaded items by search', () => {
    const loading = render(Component);
    expect(text(loading)).toContain('countdown.manage.loading');
    expect(value(loading, '.cd-new-event', 'disabled')).toBe(true);
    state.loaded = true; state.error = 'failure';
    state.items = [{ id: 1, name: 'Release', type: 'event', date: '2026-10-10' }, { id: 2, name: 'Other', type: 'event', date: '2026-10-20' }];
    const tree = render(Component);
    expect(value(tree, CountdownCardList, 'items')).toHaveLength(2);
    expect(nodes(tree, '.cd-error').length).toBeGreaterThan(0);
    trigger(tree, '.cd-search', 'onChange', { target: { value: 'release' } });
    expect(value(render(Component), CountdownCardList, 'items')).toEqual([state.items[0]]);
    trigger(tree, '.cd-new-event', 'onClick');
    expect(form.startNew).toHaveBeenCalledOnce();
    form.open = true;
    expect(value(render(Component), '.cd-page', 'inert')).toBe(true);
  });
});
