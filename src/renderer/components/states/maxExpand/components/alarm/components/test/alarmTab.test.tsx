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
 * @file alarmTab.test.tsx
 * @description AlarmTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value } from '../../../../test/componentHarness';
import { AlarmTab as Component } from '../AlarmTab';
import { AlarmEditor } from '../AlarmEditor';
const state = vi.hoisted(() => ({ adding: false, showEditor: false, editHour: 6, newHour: 8, saveEdit: vi.fn(), addAlarm: vi.fn(), setEditHour: vi.fn(), setNewHour: vi.fn() }));
vi.mock('../../hooks/useAlarmState', () => ({ useAlarmState: () => state }));
describe('AlarmTab', () => {
  it('switches new versus existing editor data and mutation callbacks', () => {
    const editing = render(Component);
    expect(value(editing, AlarmEditor, 'hour')).toBe(6);
    expect(value(editing, AlarmEditor, 'onSave')).toBe(state.saveEdit);
    expect(value(editing, AlarmEditor, 'setHour')).toBe(state.setEditHour);
    state.adding = true; state.showEditor = true;
    const adding = render(Component);
    expect(value(adding, AlarmEditor, 'hour')).toBe(8);
    expect(value(adding, AlarmEditor, 'onSave')).toBe(state.addAlarm);
    expect(value(adding, AlarmEditor, 'setHour')).toBe(state.setNewHour);
    expect(nodes(adding, '.alarm-tab-container--split')).toHaveLength(1);
  });
});
