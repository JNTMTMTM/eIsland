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
 * @description 支持直接输入与本地化标签的日历选择器。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { zhCN, enUS } from 'date-fns/locale';
import type { ReactElement } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { toLocalDateStr } from '../utils/countdownUtils';

interface CountdownCalendarProps {
  formId: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  highlightDates: Date[];
}

/**
 * 集中显示日期输入、今日描边、选中填充及事件标记。
 * @param props - 日期选择及事件高亮
 * @param props.formId - 日期输入所属的事件表单标识
 * @param props.selectedDate - 当前选中日期
 * @param props.onSelectDate - 选择有效日期的回调
 * @param props.highlightDates - 含有事件的日期
 * @returns 日期输入与日历
 */
export function CountdownCalendar({ formId, selectedDate, onSelectDate, highlightDates }: CountdownCalendarProps): ReactElement {
  const { t, i18n } = useTranslation();
  return (
    <div className="cd-calendar-wrap countdown-calendar-wrap">
      <label className="cd-field">{t('countdown.manage.date')}
        <input className="cd-input" form={formId} type="date" required min="1900-01-01" max="9999-12-31" value={toLocalDateStr(selectedDate)}
          onInput={(e) => { if (e.currentTarget.value && e.currentTarget.validity.valid) onSelectDate(new Date(`${e.currentTarget.value}T00:00:00`)); }} />
      </label>
      <DatePicker minDate={new Date(1900, 0, 1)} maxDate={new Date(9999, 11, 31)} selected={selectedDate} onChange={(date) => { if (date) onSelectDate(date); }} inline
        locale={i18n.language.startsWith('zh') ? zhCN : enUS}
        chooseDayAriaLabelPrefix={t('countdown.manage.chooseDate')} monthAriaLabelPrefix={t('countdown.manage.month')}
        previousMonthButtonLabel={t('countdown.manage.previousMonth')} nextMonthButtonLabel={t('countdown.manage.nextMonth')}
        previousMonthAriaLabel={t('countdown.manage.previousMonth')} nextMonthAriaLabel={t('countdown.manage.nextMonth')}
        highlightDates={highlightDates} calendarClassName="countdown-calendar" />
    </div>
  );
}
