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
 * @file WorldClockCard.tsx
 * @description 单个城市时钟卡片组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { WorldClockCardProps } from '../types/worldClockTypes';
import { getCityLabel } from '../utils/worldClockUtils';
import { WorldClockFlag } from './WorldClockFlag';

/**
 * 世界时钟卡片。
 * @param tick - 当前时钟 tick 数据
 * @param onRemove - 移除此城市
 * @param onToggleOverview - 将此城市加入或移出总览展示
 * @param overviewSelected - 此城市是否已展示在总览
 * @param overviewSelectionFull - 总览是否已达两个时区上限
 * @param removeHighlighted - 城市选择器的删除操作是否指向此卡片
 * @returns 时钟卡片元素
 */
export function WorldClockCard({
  tick,
  onRemove,
  onToggleOverview,
  overviewSelected,
  overviewSelectionFull,
  removeHighlighted = false,
}: WorldClockCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={`world-clock-card${overviewSelected ? ' world-clock-card--selected' : ''}${removeHighlighted ? ' world-clock-card--remove-highlighted' : ''}`}>
      <div className="world-clock-card-header">
        <WorldClockFlag countryCode={tick.countryCode} />
        <span className="world-clock-card-label">{getCityLabel(tick, t)}</span>
      </div>
      <div className="world-clock-card-time">{tick.formattedTime}</div>
      <div className="world-clock-card-meta">
        <span className="world-clock-card-offset">{tick.utcOffset}</span>
        <span className="world-clock-card-date">{tick.formattedDate}</span>
      </div>
      <div className="world-clock-card-dial" aria-hidden="true">
        <span className="world-clock-card-hand world-clock-card-hand--hour" style={{ transform: `rotate(${tick.handAngles.hour}deg)` }} />
        <span className="world-clock-card-hand world-clock-card-hand--minute" style={{ transform: `rotate(${tick.handAngles.minute}deg)` }} />
        <span className="world-clock-card-hand world-clock-card-hand--second" style={{ transform: `rotate(${tick.handAngles.second}deg)` }} />
      </div>
      <div className="world-clock-card-actions">
        <button
          className="world-clock-card-remove"
          type="button"
          onClick={() => onRemove(tick.timezone)}
          title={t('maxExpand.worldClock.removeCity', { defaultValue: '移除' })}
        >
          <img src={SvgIcon.DELETE} alt="" className="world-clock-card-remove-icon" />
        </button>
        <button
          className={`world-clock-card-add-overview${overviewSelected ? ' world-clock-card-add-overview--selected' : ''}`}
          type="button"
          disabled={!overviewSelected && overviewSelectionFull}
          onClick={() => onToggleOverview(tick.timezone)}
          title={overviewSelected
            ? t('maxExpand.worldClock.removeFromOverview')
            : overviewSelectionFull
              ? t('maxExpand.worldClock.overviewLimitReached')
              : t('maxExpand.worldClock.addToOverview')
          }
        >
          <img src={overviewSelected ? SvgIcon.CHECKED : SvgIcon.PLUS} alt="" className="world-clock-card-add-overview-icon" />
        </button>
      </div>
    </div>
  );
}
