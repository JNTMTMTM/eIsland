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
 * @file countdownCalendar.test.tsx
 * @description CountdownCalendar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import DatePicker from 'react-datepicker';
import { render, value, trigger } from '../../../../test/componentHarness';
import { CountdownCalendar as Component } from '../CountdownCalendar';
describe('CountdownCalendar', () => {
  const date = new Date(2026, 9, 6);
  it('keeps date bounds and ignores empty or invalid manual input', () => {
    const onSelectDate = vi.fn();
    const tree = render(Component, {
      onSelectDate,
      formId: 'editor',
      selectedDate: date,
      highlightDates: []
    });
    expect(value(tree, 'input', 'value')).toBe('2026-10-06');
    expect(value(tree, 'input', 'form')).toBe('editor');
    expect(value(tree, 'input', 'min')).toBe('1900-01-01');
    trigger(tree, 'input', 'onInput', { currentTarget: { value: '', validity: { valid: true } } });
    trigger(tree, 'input', 'onInput', { currentTarget: { value: 'bad', validity: { valid: false } } });
    expect(onSelectDate).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onInput', { currentTarget: { value: '2026-10-07', validity: { valid: true } } });
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 9, 7));
    trigger(tree, DatePicker, 'onChange', null);
    expect(onSelectDate).toHaveBeenCalledTimes(1);
    trigger(tree, DatePicker, 'onChange', date);
    expect(onSelectDate).toHaveBeenLastCalledWith(date);
  });
});
