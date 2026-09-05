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
import type { WorldClockTick } from '../types/worldClockTypes';

interface WorldClockCardProps {
  tick: WorldClockTick;
  onRemove: (timezone: string) => void;
}

/** 世界时钟卡片 */
export function WorldClockCard({ tick, onRemove }: WorldClockCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={`world-clock-card${tick.isLocal ? ' world-clock-card--local' : ''}`}>
      <div className="world-clock-card-header">
        <span className="world-clock-card-label">{tick.label}</span>
        {tick.isLocal && (
          <span className="world-clock-card-badge">
            {t('maxExpand.worldClock.local', { defaultValue: '本地' })}
          </span>
        )}
        <button
          className="world-clock-card-remove"
          type="button"
          onClick={() => onRemove(tick.timezone)}
          title={t('maxExpand.worldClock.removeCity', { defaultValue: '移除' })}
        >
          ×
        </button>
      </div>
      <div className="world-clock-card-time">{tick.formattedTime}</div>
      <div className="world-clock-card-meta">
        <span className="world-clock-card-offset">{tick.utcOffset}</span>
        <span className="world-clock-card-date">{tick.formattedDate}</span>
      </div>
    </div>
  );
}
