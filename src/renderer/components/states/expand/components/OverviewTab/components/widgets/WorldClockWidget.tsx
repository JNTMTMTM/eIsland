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
 * @file WorldClockWidget.tsx
 * @description Expand 总览中展示用户选择的两个世界时钟
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserTimezone } from '@multisystemsuite/timezone-engine-core';
import { useOverviewWorldClockConfig } from '../../../../../maxExpand/components/worldClock/hooks/useOverviewWorldClockConfig';
import type { WorldClockCity, WorldClockTick } from '../../../../../maxExpand/components/worldClock/types/worldClockTypes';
import { buildAllTicks, getAllTimezoneOptions, getCityLabel } from '../../../../../maxExpand/components/worldClock/utils/worldClockUtils';
import { WorldClockFlag } from '../../../../../maxExpand/components/worldClock/components/WorldClockFlag';

/** 世界时钟刷新间隔（毫秒）。 */
const CLOCK_UPDATE_INTERVAL_MS = 1000;

/** 世界时钟小组件的页面跳转回调。 */
interface WorldClockWidgetProps {
  onOpenWorldClockPage: () => void;
}

/**
 * 渲染总览世界时钟小组件。
 * @returns 世界时钟小组件
 */
export function WorldClockWidget({ onOpenWorldClockPage }: WorldClockWidgetProps): ReactElement {
  const { t, i18n } = useTranslation();
  const localTimezoneRef = useRef(getUserTimezone('UTC'));
  const [config] = useOverviewWorldClockConfig();
  const [ticks, setTicks] = useState<WorldClockTick[]>([]);
  const timezoneOptions = useMemo(() => getAllTimezoneOptions(), []);
  const locale = i18n.resolvedLanguage || i18n.language;
  const cities = useMemo<WorldClockCity[]>(() => {
    return config.timezones.map((timezone, order) => {
      const option = timezoneOptions.find((item) => item.timezone === timezone);
      return {
        timezone,
        label: option?.label ?? timezone,
        labelKey: option?.labelKey,
        order,
      };
    });
  }, [config, timezoneOptions]);

  useEffect(() => {
    const update = (): void => {
      setTicks(buildAllTicks(cities, localTimezoneRef.current, locale));
    };

    update();
    const timer = setInterval(update, CLOCK_UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [cities, locale]);

  return (
    <div className="ov-dash-widget ov-dash-world-clock-widget">
      <div className="ov-dash-widget-header">
        <span
          className="ov-dash-widget-title ov-dash-widget-title--link"
          role="button"
          tabIndex={0}
          onClick={onOpenWorldClockPage}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenWorldClockPage();
            }
          }}
        >
          {t('overview.worldClock.title')}
        </span>
      </div>
      <div className="ov-dash-world-clock-list">
        {ticks.length === 0 && <span className="ov-dash-world-clock-empty">{t('overview.worldClock.empty')}</span>}
        {ticks.map((tick) => (
          <div key={tick.timezone} className="ov-dash-world-clock-item">
            <span className="ov-dash-world-clock-city">{getCityLabel(tick, t)}</span>
            <span className="ov-dash-world-clock-time">{tick.formattedTime}</span>
            <WorldClockFlag countryCode={tick.countryCode} />
          </div>
        ))}
      </div>
    </div>
  );
}
