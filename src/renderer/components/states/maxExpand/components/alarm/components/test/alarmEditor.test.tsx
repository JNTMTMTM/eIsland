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
 * @file alarmEditor.test.tsx
 * @description AlarmEditor 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AlarmEditor as Component } from '../AlarmEditor';
import { WheelPicker } from '../WheelPicker';
describe('AlarmEditor', () => {
  const props = { adding: true, visible: true, hour: 8, minute: 5, second: 3, repeat: [0], ringtone: 'default', loop: true, repeatSummary: () => 'Sunday', weekdayLabel: (day: number) => String(day), setHour: vi.fn(), setLabel: vi.fn(), setRepeat: vi.fn(), setLoop: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
  it('renders bounded time wheels and adding or editing preview labels', () => {
    const tree = render(Component, props);
    expect(nodes(tree, WheelPicker)).toHaveLength(3);
    expect(value(tree, WheelPicker, 'max')).toBe(23);
    expect(value(tree, WheelPicker, 'max', 1)).toBe(59);
    expect(value(tree, WheelPicker, 'onChange')).toBe(props.setHour);
    expect(text(tree)).toContain('maxExpand.alarm.newTitle');
    const editing = render(Component, { ...props, adding: false, visible: false, previewPlaying: true });
    expect(text(editing)).toContain('maxExpand.alarm.editTitle');
    expect(text(editing)).toContain('maxExpand.alarm.pausePreviewRingtone');
    expect(nodes(editing, '.alarm-editor-panel--visible')).toHaveLength(0);
  });
  it('toggles weekday, label and loop and routes save and cancel', () => {
    const tree = render(Component, props);
    trigger(tree, '.alarm-weekday-btn', 'onClick');
    expect(props.setRepeat).toHaveBeenCalledWith([0, 1]);
    trigger(tree, '.alarm-editor-label-input', 'onChange', { target: { value: 'Wake' } });
    (value(tree, 'input', 'onChange', 1) as (event: unknown) => void)({ target: { checked: false } });
    expect(props.setLabel).toHaveBeenCalledWith('Wake');
    expect(props.setLoop).toHaveBeenCalledWith(false);
    trigger(tree, '.alarm-editor-save-btn', 'onClick');
    trigger(tree, '.alarm-editor-cancel-btn', 'onClick');
    expect(props.onSave).toHaveBeenCalledOnce();
    expect(props.onCancel).toHaveBeenCalledOnce();
  });
});
