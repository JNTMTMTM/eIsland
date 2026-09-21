/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarYearOverview.test.ts
 * @description 验证全年概览初始渲染只挂载目标年份，缓冲年份使用等高占位。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CalendarGridProps } from '../types/calendarTypes';
import { CalendarYearOverview } from './CalendarYearOverview';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

/**
 * 创建无浏览器环境下的年份视图参数。
 * @param year - 初始显示年份
 * @returns 日历属性
 */
function makeProps(year: number): CalendarGridProps {
  const format = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' });
  return {
    overviewYear: year, detailsExpanded: true, detailsId: 'details',
    selectedDate: new Date(year, 8, 22), today: new Date(year, 8, 22), locale: 'en-US',
    events: [], holidays: new Map(),
    formats: { full: format, month: format, weekday: format, lunar: format, lunarDay: format },
    selectedButtonRef: { current: null }, focusDateRef: { current: false },
    onSelectDate: vi.fn(), onDateKeyDown: vi.fn(), onToggleDetails: vi.fn(), onToggleOverview: vi.fn(), onVisibleYearChange: vi.fn(),
  };
}

describe('year overview rendering budget', () => {
  it.each([[2026, 365], [2024, 366]])('mounts only the visible year %i, including leap days', (year, days) => {
    const html = renderToStaticMarkup(createElement(CalendarYearOverview, makeProps(year)));
    expect(html.match(/class="calendar-overview-day"/g)).toHaveLength(days);
    expect(html.match(/class="calendar-overview-month-placeholder"/g)).toHaveLength(24);
    expect(html.match(/aria-current="date"/g)).toHaveLength(1);
  });

  it('starts at the browsed year even when the selected date belongs to a distant year', () => {
    const props = makeProps(2030);
    props.selectedDate = new Date(2026, 8, 22);
    const html = renderToStaticMarkup(createElement(CalendarYearOverview, props));
    expect(html.match(/class="calendar-overview-day"/g)).toHaveLength(365);
    expect(html).toContain('data-year="2030"');
    expect(html.match(/class="calendar-overview-day"[^>]*aria-pressed="true"/g)).toBeNull();
  });
});
