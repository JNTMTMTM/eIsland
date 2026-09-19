/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarHolidayDetails.tsx
 * @description 所选日期的公共假日、当前地区与加载反馈。
 * @author 鸡哥
 */

import { useId, useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarHolidayInfo } from '../types/calendarHolidayTypes';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';

/**
 * 显示节假日详情，州、省范围可单独选择。
 * @param props - 所选日期、界面语言和节假日状态
 * @returns 节假日详情区块
 */
export function CalendarHolidayDetails({ selectedDate, locale, info }: {
  selectedDate: Date;
  locale: string;
  info: CalendarHolidayInfo;
}): ReactElement {
  const { t } = useTranslation();
  const regionId = useId();
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  const names = info.holidays.get(getCalendarDateKey(selectedDate));

  return (
    <div className="calendar-holiday-details">
      <div className="calendar-holiday-heading">
        <span>{t('maxExpand.calendar.holidays')}</span>
        {info.countryCode && <span title={t('maxExpand.calendar.currentRegion')}>{countryNames.of(info.countryCode)}</span>}
      </div>
      {info.subdivisionCodes.length > 0 && (
        <div className="calendar-holiday-region">
          <label htmlFor={regionId}>{t('maxExpand.calendar.subdivision')}</label>
          <select id={regionId} value={info.subdivisionCode} onChange={(event) => info.selectSubdivision(event.target.value)}>
            <option value="">{t('maxExpand.calendar.nationalHolidays')}</option>
            {info.subdivisionCodes.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>
      )}
      {names && <ul className="calendar-holiday-names">{names.map((name) => <li key={name}>{name}</li>)}</ul>}
      <div className="calendar-holiday-status" role="status">
        {info.status === 'loading' && t('maxExpand.calendar.holidaysLoading')}
        {info.status === 'unsupported' && t('maxExpand.calendar.holidaysUnsupported')}
        {info.status === 'error' && t('maxExpand.calendar.holidaysError')}
        {info.status === 'locationUnavailable' && t('maxExpand.calendar.holidaysLocationUnavailable')}
        {info.status === 'ready' && !names && t('maxExpand.calendar.noHoliday')}
        {(info.status === 'error' || info.status === 'unsupported' || info.status === 'locationUnavailable') && (
          <button type="button" onClick={info.retry}>{t('maxExpand.calendar.holidaysRetry')}</button>
        )}
      </div>
    </div>
  );
}
