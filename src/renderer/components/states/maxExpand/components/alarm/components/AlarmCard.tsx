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
 * @file AlarmCard.tsx
 * @description 闹钟列表卡片组件。
 * @author 鸡哥
 */

import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { AlarmCardProps } from '../types/alarmCardTypes';
import { formatTime } from '../utils/alarmUtils';

/** 闹钟卡片 */
export function AlarmCard({
  alarm,
  isActive,
  repeatSummary,
  nextRingDesc,
  onStartEdit,
  onDelete,
  onToggle,
  onToggleOverview,
  overviewSelected,
  overviewSelectionFull,
}: AlarmCardProps): ReactElement {
  const { t } = useTranslation();

  /** 构建重复规则与下次响铃的辅助信息，用圆点分隔。 */
  const buildMetaFragments = (): ReactNode[] => {
    const parts: ReactNode[] = [];
    const rep = repeatSummary(alarm.repeat);
    if (rep) {
      if (parts.length > 0) parts.push(<span key="s1" className="alarm-card-meta-sep" />);
      parts.push(<span key="repeat">{rep}</span>);
    }
    const next = nextRingDesc(alarm);
    if (next) {
      if (parts.length > 0) parts.push(<span key="s2" className="alarm-card-meta-sep" />);
      parts.push(<span key="next">{next}</span>);
    }
    return parts;
  };

  return (
    <div
      className={`alarm-card${alarm.enabled ? '' : ' alarm-card--disabled'}${isActive ? ' alarm-card--active' : ''}${overviewSelected ? ' alarm-card--overview-selected' : ''}`}
    >
      <button className="alarm-card-left" type="button" onClick={() => onStartEdit(alarm)}>
        <span className="alarm-card-label" title={alarm.label || t('maxExpand.alarm.title')}>
          {alarm.label || t('maxExpand.alarm.title')}
        </span>
        <span className="alarm-card-time">{formatTime(alarm.hour, alarm.minute, alarm.second)}</span>
        <span className="alarm-card-meta">
          {buildMetaFragments()}
        </span>
      </button>
      <div className="alarm-card-actions">
        <button
          className="alarm-delete-btn"
          type="button"
          onClick={() => onDelete(alarm.id)}
          title={t('maxExpand.alarm.delete', { defaultValue: '删除' })}
        >
          <img src={SvgIcon.DELETE} alt="" className="alarm-tab-btn-icon" />
        </button>
        <button
          className={`alarm-overview-btn${overviewSelected ? ' alarm-overview-btn--selected' : ''}`}
          type="button"
          disabled={!overviewSelected && overviewSelectionFull}
          aria-pressed={overviewSelected}
          onClick={() => onToggleOverview(alarm.id)}
          title={overviewSelected ? t('overview.alarm.remove') : overviewSelectionFull ? t('overview.alarm.limit') : t('overview.alarm.add')}
          aria-label={overviewSelected ? t('overview.alarm.remove') : t('overview.alarm.add')}
        >
          <img src={SvgIcon.PLUS} alt="" className="alarm-tab-btn-icon" />
        </button>
      </div>
      <div className="alarm-card-right">
        <button
          className={`alarm-toggle${alarm.enabled ? ' alarm-toggle--on' : ''}`}
          type="button"
          onClick={() => onToggle(alarm.id)}
          title={alarm.enabled ? t('maxExpand.alarm.turnOff', { defaultValue: '关闭' }) : t('maxExpand.alarm.turnOn', { defaultValue: '开启' })}
        >
          <span className="alarm-toggle-track">
            <span className="alarm-toggle-thumb" />
          </span>
        </button>
      </div>
    </div>
  );
}
