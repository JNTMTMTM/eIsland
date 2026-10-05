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
 * @file alarmSidebar.test.tsx
 * @description AlarmSidebar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { AlarmSidebar as Component } from '../AlarmSidebar';
import { AlarmCard } from '../AlarmCard';
const selection = vi.hoisted(() => ({ loaded: true, alarmIds: [] as number[], updateAlarmIds: vi.fn() }));
vi.mock('../../hooks/useOverviewAlarmConfig', () => ({ useOverviewAlarmConfig: () => selection }));
describe('AlarmSidebar', () => {
  const alarm = { id: 1 };
  const props = { t: (key: string) => key, adding: false, loaded: false, sortedAlarms: [], setAdding: vi.fn(), closeEditor: vi.fn(), setNewHour: vi.fn(), setNewMinute: vi.fn(), setNewSecond: vi.fn() };
  afterEach(() => vi.useRealTimers());
  it('shows loading and empty states and initializes a new alarm from current time', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 6, 8, 5, 3));
    expect(text(render(Component, props))).toContain('maxExpand.alarm.loading');
    expect(text(render(Component, { ...props, loaded: true }))).toContain('maxExpand.alarm.empty');
    const tree = render(Component, props);
    trigger(tree, '.alarm-tab-add-btn', 'onClick');
    expect(props.setNewHour).toHaveBeenCalledWith(8);
    expect(props.setNewMinute).toHaveBeenCalledWith(5);
    expect(props.setNewSecond).toHaveBeenCalledWith(3);
    expect(props.setAdding).toHaveBeenCalledWith(true);
    trigger(render(Component, { ...props, adding: true }), '.alarm-tab-add-btn', 'onClick');
    expect(props.closeEditor).toHaveBeenCalledOnce();
  });
  it('respects unloaded selection, removes selected IDs and adds available IDs', () => {
    const tree = render(Component, { ...props, sortedAlarms: [alarm], editingId: 1 });
    expect(value(tree, AlarmCard, 'isActive')).toBe(true);
    selection.loaded = false;
    trigger(render(Component, { ...props, sortedAlarms: [alarm] }), AlarmCard, 'onToggleOverview', 1);
    expect(selection.updateAlarmIds).not.toHaveBeenCalled();
    selection.loaded = true;
    trigger(render(Component, { ...props, sortedAlarms: [alarm] }), AlarmCard, 'onToggleOverview', 1);
    expect(selection.updateAlarmIds).toHaveBeenCalledWith([1]);
    selection.alarmIds = [1];
    trigger(render(Component, { ...props, sortedAlarms: [alarm] }), AlarmCard, 'onToggleOverview', 1);
    expect(selection.updateAlarmIds).toHaveBeenLastCalledWith([]);
  });
});
