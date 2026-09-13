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
 * @file AlarmSidebar.tsx
 * @description 闹钟面板左侧列表侧边栏
 * @author 鸡哥
 */

import { useEffect, type ReactElement } from 'react';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { AlarmSidebarProps } from '../types/alarmTypes';
import { AlarmCard } from './AlarmCard';
import { useOverviewAlarmConfig } from '../hooks/useOverviewAlarmConfig';
import { OVERVIEW_ALARM_LIMIT } from '../config/overviewAlarmConfig';

/**
 * 闹钟面板左侧列表
 * @param props - 组件属性
 * @returns 闹钟列表侧边栏 React 元素
 */
export function AlarmSidebar({
  t,
  showEditor,
  adding,
  setAdding,
  closeEditor,
  loaded,
  sortedAlarms,
  editingId,
  weekdayLabel,
  repeatSummary,
  nextRingDesc,
  startEdit,
  deleteAlarm,
  toggleEnabled,
  setNewHour,
  setNewMinute,
  setNewSecond,
}: AlarmSidebarProps): ReactElement {
  const { alarmIds, loaded: selectionLoaded, updateAlarmIds } = useOverviewAlarmConfig();

  // 删除闹钟或其他窗口更新列表后，移除失效的展示选项。
  useEffect(() => {
    if (!loaded || !selectionLoaded) return;
    const existing = alarmIds.filter((id) => sortedAlarms.some((alarm) => alarm.id === id));
    if (existing.length !== alarmIds.length) updateAlarmIds(existing);
  }, [loaded, selectionLoaded, alarmIds, sortedAlarms, updateAlarmIds]);

  const toggleOverview = (id: number): void => {
    if (!selectionLoaded) return;
    if (alarmIds.includes(id)) updateAlarmIds(alarmIds.filter((item) => item !== id));
    else if (alarmIds.length < OVERVIEW_ALARM_LIMIT) updateAlarmIds([...alarmIds, id]);
  };

  return (
    <div className={`alarm-tab-sidebar${showEditor ? ' alarm-tab-sidebar--compact' : ''}`}>
      <div className="alarm-tab-header">
        <div className="alarm-tab-title">{t('maxExpand.alarm.title', { defaultValue: '闹钟' })}</div>
        <button
          className={`alarm-tab-add-btn${adding ? ' alarm-tab-add-btn--active' : ''}`}
          type="button"
          onClick={() => {
            if (adding) { closeEditor(); }
            else { const _now = new Date(); setNewHour(_now.getHours()); setNewMinute(_now.getMinutes()); setNewSecond(_now.getSeconds()); setAdding(true); }
          }}
          title={adding ? t('maxExpand.alarm.cancel') : t('maxExpand.alarm.add')}
          aria-label={adding ? t('maxExpand.alarm.cancel') : t('maxExpand.alarm.add')}
          aria-expanded={adding}
        >
          <img src={adding ? SvgIcon.CANCEL : SvgIcon.PLUS} alt="" className="alarm-tab-btn-icon" />
        </button>
      </div>

      <div className="alarm-tab-list">
        {!loaded && <div className="alarm-tab-loading">{t('maxExpand.alarm.loading', { defaultValue: '加载中…' })}</div>}
        {loaded && sortedAlarms.length === 0 && (
          <div className="alarm-tab-empty">
            <span className="alarm-tab-empty-text">{t('maxExpand.alarm.empty', { defaultValue: '暂无闹钟，点击 + 新建' })}</span>
          </div>
        )}
        {sortedAlarms.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            isActive={editingId === alarm.id}
            weekdayLabel={weekdayLabel}
            repeatSummary={repeatSummary}
            nextRingDesc={nextRingDesc}
            onStartEdit={startEdit}
            onDelete={deleteAlarm}
            onToggle={toggleEnabled}
            onToggleOverview={toggleOverview}
            overviewSelected={alarmIds.includes(alarm.id)}
            overviewSelectionFull={!selectionLoaded || alarmIds.length >= OVERVIEW_ALARM_LIMIT}
          />
        ))}
      </div>
    </div>
  );
}
