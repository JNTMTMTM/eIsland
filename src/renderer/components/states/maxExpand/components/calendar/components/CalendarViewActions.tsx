/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarViewActions.tsx
 * @description 月历与全年概览共用的今日、视图切换及详情折叠按钮。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { CalendarGridProps } from '../types/calendarTypes';

type CalendarViewActionsProps = Pick<CalendarGridProps, 'detailsExpanded' | 'detailsId' | 'onToggleDetails' | 'onSelectDate' | 'onToggleOverview'> & {
  overview: boolean;
  visibleDate: Date;
};

/**
 * 渲染日历工具按钮。
 * @param props - 当前视图、浏览日期及导航回调
 * @returns 文本今日按钮及 SvgIcon 图标按钮
 */
export function CalendarViewActions(props: CalendarViewActionsProps): ReactElement {
  const { t } = useTranslation();
  const viewLabel = t(props.overview ? 'maxExpand.calendar.monthView' : 'maxExpand.calendar.yearOverview');
  const detailsLabel = t(props.detailsExpanded ? 'maxExpand.calendar.collapseDetails' : 'maxExpand.calendar.expandDetails');
  return (
    <span className="calendar-header-actions">
      <button className="calendar-today-button" type="button" onClick={() => props.onSelectDate(new Date())}>
        {t('maxExpand.calendar.goToToday')}
      </button>
      <button className="calendar-details-toggle calendar-view-toggle" type="button" aria-pressed={props.overview} aria-label={viewLabel} title={viewLabel} onClick={() => props.onToggleOverview(props.visibleDate)}>
        <img className="calendar-details-toggle-icon-img" src={SvgIcon.CALENDER} alt="" draggable={false} />
      </button>
      <button className="calendar-details-toggle" type="button" aria-expanded={props.detailsExpanded} aria-controls={props.detailsId} aria-label={detailsLabel} title={detailsLabel} onClick={props.onToggleDetails}>
        <img className="calendar-details-toggle-icon-img" src={props.detailsExpanded ? SvgIcon.EXPAND : SvgIcon.COLLAPSE} alt="" draggable={false} />
      </button>
    </span>
  );
}
