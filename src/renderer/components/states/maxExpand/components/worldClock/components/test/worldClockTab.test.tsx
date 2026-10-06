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
 * @file worldClockTab.test.tsx
 * @description WorldClockTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { WorldClockTab as Component } from '../WorldClockTab';
import { WorldClockCard } from '../WorldClockCard';
import { WorldClockCityPicker } from '../WorldClockCityPicker';
const state = vi.hoisted(() => ({ showPicker: false, cities: [], ticks: [] as { timezone: string }[], setShowPicker: vi.fn(), removeCity: vi.fn() }));
const config = vi.hoisted(() => ({ timezones: ['Asia/Shanghai'] }));
const setOverview = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useWorldClockState', () => ({ useWorldClockState: () => state }));
vi.mock('../../hooks/useOverviewWorldClockConfig', () => ({ useOverviewWorldClockConfig: () => [config, setOverview] }));
describe('WorldClockTab', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('toggles the picker and maps selected overview clocks', () => {
    const tree = render(Component);
    expect(value(tree, WorldClockCityPicker, 'visible')).toBe(false);
    trigger(tree, '.world-clock-add-btn', 'onClick');
    expect(state.setShowPicker).toHaveBeenCalledWith(true);
    state.showPicker = true; state.ticks = [{ timezone: 'Asia/Shanghai' }];
    const split = render(Component);
    expect(nodes(split, '.world-clock-container--split')).toHaveLength(1);
    expect(value(split, WorldClockCard, 'overviewSelected')).toBe(true);
  });
  it('persists removal from overview and enforces its two-clock limit', () => {
    vi.stubGlobal('window', { api: { storeWrite: vi.fn().mockResolvedValue(undefined) } });
    state.ticks = [{ timezone: 'Asia/Shanghai' }];
    const tree = render(Component);
    trigger(tree, WorldClockCard, 'onToggleOverview', 'Asia/Shanghai');
    expect(setOverview).toHaveBeenCalledWith({ timezones: [] });
    config.timezones = ['Asia/Shanghai', 'Asia/Tokyo'];
    trigger(render(Component), WorldClockCard, 'onToggleOverview', 'Europe/London');
    expect(setOverview).toHaveBeenCalledTimes(1);
    trigger(render(Component), WorldClockCard, 'onRemove', 'Asia/Shanghai');
    expect(state.removeCity).toHaveBeenCalledWith('Asia/Shanghai');
    expect(setOverview).toHaveBeenLastCalledWith({ timezones: ['Asia/Tokyo'] });
  });
});
