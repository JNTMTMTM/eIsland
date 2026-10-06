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
 * @file calendarHolidayDetails.test.tsx
 * @description CalendarHolidayDetails 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { CalendarHolidayDetails as Component } from '../CalendarHolidayDetails';
const date = new Date(2026, 9, 6);
describe('CalendarHolidayDetails', () => {
  const info = { holidays: new Map<string, string[]>(), countryCode: 'US', subdivisionCodes: [] as string[], subdivisionCode: '', status: 'ready', retry: vi.fn(), selectSubdivision: vi.fn() };
  it.each(['loading', 'unsupported', 'error', 'locationUnavailable', 'ready'])('renders %s feedback and retry availability', (currentStatus) => {
    const tree = render(Component, { selectedDate: date, locale: 'en-US', info: {
      ...info,
      status: currentStatus
    } });
    const retryable = ['unsupported', 'error', 'locationUnavailable'].includes(currentStatus);
    expect(nodes(tree, 'button')).toHaveLength(retryable ? 1 : 0);
    expect(text(tree)).toContain(currentStatus === 'ready' ? 'maxExpand.calendar.noHoliday' : 'maxExpand.calendar.holidays');
    if (retryable) { trigger(tree, 'button', 'onClick'); expect(info.retry).toHaveBeenCalledOnce(); }
  });
  it('shows holiday names and a correctly linked subdivision selector', () => {
    const tree = render(Component, { selectedDate: date, locale: 'en-US', info: { ...info, holidays: new Map([['2026-10-06', ['Holiday']]]), subdivisionCodes: ['US-CA'] } });
    expect(text(tree)).toContain('Holiday');
    expect(text(tree)).not.toContain('maxExpand.calendar.noHoliday');
    expect(value(tree, 'label', 'htmlFor')).toBe(value(tree, 'select', 'id'));
    trigger(tree, 'select', 'onChange', { target: { value: 'US-CA' } });
    expect(info.selectSubdivision).toHaveBeenCalledWith('US-CA');
  });
});
