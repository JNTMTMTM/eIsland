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
 * @file WorldClockTab.tsx
 * @description 最大展开模式 — 世界时钟 Tab — 多时区实时时钟显示
 * @author 鸡哥
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { useWorldClockState } from '../hooks/useWorldClockState';
import { useOverviewWorldClockConfig } from '../hooks/useOverviewWorldClockConfig';
import {
  normalizeOverviewWorldClockConfig,
  OVERVIEW_TIMEZONES_STORE_KEY,
} from '../config/overviewWorldClockConfig';
import { getAllTimezoneOptions } from '../utils/worldClockUtils';
import { WorldClockCard } from './WorldClockCard';
import { WorldClockCityPicker } from './WorldClockCityPicker';

/**
 * 世界时钟 Tab — 最大展开模式下的世界时钟面板
 */
export function WorldClockTab(): ReactElement {
  const { t } = useTranslation();
  const state = useWorldClockState();
  const [removeHoveredTimezone, setRemoveHoveredTimezone] = useState<string | null>(null);
  const [overviewConfig, setOverviewConfig] = useOverviewWorldClockConfig();
  const timezoneOptions = useMemo(() => getAllTimezoneOptions(), []);
  const { setShowPicker } = state;
  const closePicker = useCallback(() => setShowPicker(false), [setShowPicker]);

  const updateOverviewTimezones = useCallback((timezones: string[]): void => {
    const updated = normalizeOverviewWorldClockConfig({ timezones });
    setOverviewConfig(updated);
    window.api.storeWrite(OVERVIEW_TIMEZONES_STORE_KEY, updated).catch(() => {});
  }, []);

  const handleToggleOverview = useCallback((timezone: string): void => {
    const selected = overviewConfig.timezones.includes(timezone);
    if (selected) {
      updateOverviewTimezones(overviewConfig.timezones.filter((item) => item !== timezone));
      return;
    }
    if (overviewConfig.timezones.length < 2) {
      updateOverviewTimezones([...overviewConfig.timezones, timezone]);
    }
  }, [overviewConfig.timezones, updateOverviewTimezones]);

  const handleRemoveCity = useCallback((timezone: string): void => {
    state.removeCity(timezone);
    if (overviewConfig.timezones.includes(timezone)) {
      updateOverviewTimezones(overviewConfig.timezones.filter((item) => item !== timezone));
    }
  }, [overviewConfig.timezones, state.removeCity, updateOverviewTimezones]);

  const existingTimezones = useMemo(
    () => state.cities.map((c) => c.timezone),
    [state.cities],
  );

  return (
    <div className={`max-expand-tab-panel world-clock-container${state.showPicker ? ' world-clock-container--split' : ''}`}>
      <div className={`world-clock-sidebar${state.showPicker ? ' world-clock-sidebar--compact' : ''}`}>
        <div className="world-clock-header">
          <span className="world-clock-title">
            {t('maxExpand.worldClock.title', { defaultValue: '世界时钟' })}
          </span>
          <button
            className={`world-clock-add-btn${state.showPicker ? ' world-clock-add-btn--active' : ''}`}
            type="button"
            onClick={() => state.setShowPicker(!state.showPicker)}
            title={state.showPicker ? t('maxExpand.worldClock.closePicker') : t('maxExpand.worldClock.addCity')}
            aria-label={state.showPicker ? t('maxExpand.worldClock.closePicker') : t('maxExpand.worldClock.addCity')}
            aria-expanded={state.showPicker}
          >
            <img src={state.showPicker ? SvgIcon.CANCEL : SvgIcon.PLUS} alt="" className="world-clock-add-btn-icon" />
          </button>
        </div>

        <div className="world-clock-grid">
          {state.ticks.map((tick) => (
            <WorldClockCard
              key={tick.timezone}
              tick={tick}
              onRemove={handleRemoveCity}
              onToggleOverview={handleToggleOverview}
              overviewSelected={overviewConfig.timezones.includes(tick.timezone)}
              overviewSelectionFull={overviewConfig.timezones.length >= 2}
              removeHighlighted={state.showPicker && removeHoveredTimezone === tick.timezone}
            />
          ))}
        </div>
      </div>

      <WorldClockCityPicker
        visible={state.showPicker}
        existingTimezones={existingTimezones}
        onSelect={state.addCity}
        onRemove={state.removeCity}
        onRemoveHover={setRemoveHoveredTimezone}
        onClose={closePicker}
        options={timezoneOptions}
      />
    </div>
  );
}
