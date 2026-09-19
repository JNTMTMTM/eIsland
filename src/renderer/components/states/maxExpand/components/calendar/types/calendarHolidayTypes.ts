/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarHolidayTypes.ts
 * @description 节假日接口、地区匹配及加载状态类型。
 * @author 鸡哥
 */

/** Nager.Holidays V4 返回的单日节假日记录。 */
export interface CalendarHoliday {
  date: string;
  name: string;
  countryCode: string;
  nationalHoliday: boolean;
  subdivisionCodes: string[] | null;
  holidayTypes: string[];
}

/** 同一公历日期可以对应多个节日名称。 */
export type CalendarHolidayIndex = Map<string, string[]>;

/** 区分加载失败与成功但没有节假日。 */
export type CalendarHolidayStatus = 'loading' | 'ready' | 'error' | 'unsupported' | 'locationUnavailable';

/** 日历视图和详情共享的节假日状态。 */
export interface CalendarHolidayInfo {
  holidays: CalendarHolidayIndex;
  countryCode: string;
  subdivisionCode: string;
  subdivisionCodes: string[];
  status: CalendarHolidayStatus;
  retry: () => void;
  selectSubdivision: (code: string) => void;
}
