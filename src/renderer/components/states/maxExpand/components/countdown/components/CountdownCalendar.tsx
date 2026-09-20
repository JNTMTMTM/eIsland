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
 * @file CountdownCalendar.tsx
 * @description 带日期状态图例与本地化标签的日历选择器。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { zhCN, enUS } from 'date-fns/locale';
import type { ReactElement } from 'react';
import 'react-datepicker/dist/react-datepicker.css';

interface CountdownCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  highlightDates: Date[];
}

/**
 * 区分今日描边、选中填充及事件圆点。
 * @param props - 日期选择及事件高亮
 * @param props.selectedDate - 当前选中日期
 * @param props.onSelectDate - 选择有效日期的回调
 * @param props.highlightDates - 含有事件的日期
 * @returns 日历与图例
 */
export function CountdownCalendar({ selectedDate, onSelectDate, highlightDates }: CountdownCalendarProps): ReactElement {
  const { t, i18n } = useTranslation();
  return (
    <div className="cd-calendar-wrap countdown-calendar-wrap">
      <DatePicker selected={selectedDate} onChange={(date) => { if (date) onSelectDate(date); }} inline
        locale={i18n.language.startsWith('zh') ? zhCN : enUS}
        chooseDayAriaLabelPrefix={t('countdown.manage.chooseDate')} monthAriaLabelPrefix={t('countdown.manage.month')}
        previousMonthButtonLabel={t('countdown.manage.previousMonth')} nextMonthButtonLabel={t('countdown.manage.nextMonth')}
        previousMonthAriaLabel={t('countdown.manage.previousMonth')} nextMonthAriaLabel={t('countdown.manage.nextMonth')}
        highlightDates={highlightDates} calendarClassName="countdown-calendar" />
      <div className="cd-calendar-legend">
        <span className="cd-legend-today">{t('countdown.manage.today')}</span>
        <span className="cd-legend-selected">{t('countdown.manage.selected')}</span>
        <span className="cd-legend-event">{t('countdown.manage.hasEvent')}</span>
      </div>
    </div>
  );
}
