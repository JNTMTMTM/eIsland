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
 * @file EventStreamPanel.tsx
 * @description CLI 面板右侧事件流与控制区
 * @author 鸡哥
 */

import { useState, type ReactElement } from 'react';
import { EVENT_FILTERS } from '../config/cliFilters';
import type { EventStreamPanelProps } from '../types/types';
import { filterLabel } from '../utils/cliFormatters';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { ActivityHeatmap } from './ActivityHeatmap';
import { EventRow } from './EventRow';
import { CliProviderSwitch } from './CliProviderSwitch';

/**
 * CLI 面板右侧事件流 + 控制区
 * @param props - 组件属性
 * @returns 事件流面板 React 元素
 */
export function EventStreamPanel({
  t,
  provider,
  onProviderChange,
  snapshot,
  eventFilter,
  setEventFilter,
  selectedSessionTitle,
  filteredEvents,
  pagedEvents,
  pendingPermissionEventIds,
  totalPages,
  currentPage,
  setPage,
  enableMonitor,
  disableMonitor,
  clearEvents,
  setCli,
  activeSessionCount,
}: EventStreamPanelProps): ReactElement {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);

  return (
    <div className="cli-tab-main">
      <div className="cli-tab-main-header">
        <div className="cli-tab-stream-title">
          <CliProviderSwitch provider={provider} onChange={onProviderChange} />
          <span className={`cli-tab-hook-badge ${snapshot.enabled ? 'enabled' : 'disabled'}`}>
            {snapshot.enabled ? t('maxExpand.cli.enabled', { defaultValue: '已启用' }) : t('maxExpand.cli.disabled', { defaultValue: '未启用' })}
          </span>
          {totalPages > 1 && (
            <span className="cli-tab-phase cli-tab-page-indicator">{currentPage + 1}/{totalPages}</span>
          )}
          <span className="cli-tab-stream-session">
            {selectedSessionTitle ?? t('maxExpand.cli.allSessions', { defaultValue: '全部会话' })}
          </span>
        </div>
        <div className="cli-tab-actions">
          {totalPages > 1 && (
            <div className="cli-tab-page-switch">
              <button
                className="cli-tab-page-btn"
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                title={t('maxExpand.cli.prevPage', { defaultValue: '上一页' })}
              >
                <img src={SvgIcon.PREVIOUS} alt="" width="12" height="12" draggable={false} />
              </button>
              <button
                className="cli-tab-page-btn"
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage(currentPage + 1)}
                title={t('maxExpand.cli.nextPage', { defaultValue: '下一页' })}
              >
                <img src={SvgIcon.NEXT} alt="" width="12" height="12" draggable={false} />
              </button>
            </div>
          )}
          <button
            className="cli-tab-action-btn"
            type="button"
            title={snapshot.enabled
              ? t(provider === 'claude' ? 'maxExpand.cli.disableHook' : 'maxExpand.cli.disableMonitor')
              : t(provider === 'claude' ? 'maxExpand.cli.enableHook' : 'maxExpand.cli.enableMonitor')}
            onClick={snapshot.enabled ? disableMonitor : enableMonitor}
          >
            <img src={snapshot.enabled ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" width="14" height="14" draggable={false} />
          </button>
          <button
            className="cli-tab-action-btn cli-tab-action-btn--secondary"
            type="button"
            title={t('maxExpand.cli.clear', { defaultValue: '清空' })}
            onClick={clearEvents}
            disabled={snapshot.events.length === 0}
          >
            <img src={SvgIcon.DELETE} alt="" width="14" height="14" draggable={false} />
          </button>
          <button
            className={`cli-tab-action-btn ${filtersVisible ? 'cli-tab-action-btn--active' : ''}`}
            type="button"
            title={t('maxExpand.cli.filterAria', { defaultValue: '事件筛选' })}
            onClick={() => { setFiltersVisible((v) => !v); setHeatmapVisible(false); }}
          >
            <img src={SvgIcon.FILTER} alt="" width="14" height="14" draggable={false} />
          </button>
          <button
            className={`cli-tab-action-btn ${heatmapVisible ? 'cli-tab-action-btn--active' : ''}`}
            type="button"
            title={t('maxExpand.cli.heatmapAria', { defaultValue: '活动热力图' })}
            onClick={() => { setHeatmapVisible((v) => !v); setFiltersVisible(false); }}
          >
            <img src={SvgIcon.FIRE} alt="" width="14" height="14" draggable={false} />
          </button>
          <button
            className="cli-tab-action-btn"
            type="button"
            title={t('maxExpand.cli.enterCliState', { defaultValue: '进入实时流' })}
            onClick={() => setCli()}
            disabled={activeSessionCount === 0}
          >
            <img src={SvgIcon.AI} alt="" width="14" height="14" draggable={false} />
          </button>
        </div>
      </div>

      <div className={`cli-tab-event-filters ${filtersVisible ? 'open' : ''}`} role="tablist" aria-label={t('maxExpand.cli.filterAria', { defaultValue: '事件筛选' })}>
        {EVENT_FILTERS.map((filter) => (
          <button
            className={`cli-tab-filter-btn ${eventFilter === filter ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={eventFilter === filter}
            key={filter}
            onClick={() => setEventFilter(filter)}
          >
            {filterLabel(filter, t)}
          </button>
        ))}
      </div>

      <div className={`cli-tab-heatmap ${heatmapVisible ? 'open' : ''}`}>
        <ActivityHeatmap heatmap={snapshot.heatmap} visible={heatmapVisible} />
      </div>

      <div className="cli-tab-event-list">
        {filteredEvents.length === 0 && (
          <div className="cli-tab-empty">{t('maxExpand.cli.emptyEvents', { defaultValue: '暂无事件' })}</div>
        )}
        {pagedEvents.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            t={t}
            showPermission={provider === 'claude' && pendingPermissionEventIds.has(event.id)}
          />
        ))}
      </div>
    </div>
  );
}
