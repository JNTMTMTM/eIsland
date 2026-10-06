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
 * @file alarmCard.test.tsx
 * @description AlarmCard 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AlarmCard as Component } from '../AlarmCard';

describe('AlarmCard', () => {
  const alarm = { id: 1, enabled: true, label: '', hour: 8, minute: 5, second: 3, repeat: [] };
  const props = { alarm, repeatSummary: () => 'Daily', nextRingDesc: () => 'Tomorrow', onStartEdit: vi.fn(), onDelete: vi.fn(), onToggle: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: true };
  it('renders time, metadata separators and disabled overview capacity', () => {
    const tree = render(Component, props);
    expect(text(tree)).toContain('08:05:03');
    expect(nodes(tree, '.alarm-card-meta-sep')).toHaveLength(1);
    expect(value(tree, '.alarm-overview-btn', 'disabled')).toBe(true);
    const disabled = render(Component, { ...props, alarm: { ...alarm, enabled: false, label: 'Wake' }, overviewSelected: true, isActive: true, repeatSummary: () => '', nextRingDesc: () => '' });
    expect(nodes(disabled, '.alarm-card--disabled')).toHaveLength(1);
    expect(nodes(disabled, '.alarm-card-meta-sep')).toHaveLength(0);
    expect(value(disabled, '.alarm-overview-btn', 'disabled')).toBe(false);
    expect(value(disabled, '.alarm-overview-btn', 'aria-pressed')).toBe(true);
  });
  it('仅显示下次响铃时不插入分隔符，并允许加入未满的概览', () => {
    const tree = render(Component, {
      ...props,
      repeatSummary: () => '',
      overviewSelectionFull: false,
    });
    expect(text(tree)).toContain('Tomorrow');
    expect(nodes(tree, '.alarm-card-meta-sep')).toHaveLength(0);
    expect(value(tree, '.alarm-overview-btn', 'disabled')).toBe(false);
    trigger(tree, '.alarm-overview-btn', 'onClick');
    expect(props.onToggleOverview).toHaveBeenCalledWith(alarm.id);
  });

  it('routes edit and ID based actions', () => {
    const tree = render(Component, props);
    trigger(tree, '.alarm-card-left', 'onClick');
    trigger(tree, '.alarm-delete-btn', 'onClick');
    trigger(tree, '.alarm-toggle', 'onClick');
    trigger(tree, '.alarm-overview-btn', 'onClick');
    expect(props.onStartEdit).toHaveBeenCalledWith(alarm);
    [props.onDelete, props.onToggle, props.onToggleOverview].forEach((callback) => expect(callback).toHaveBeenCalledWith(1));
  });
});
