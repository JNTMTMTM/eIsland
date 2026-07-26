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
 * @file BrightnessControl.tsx
 * @description Hover 时间页中的屏幕亮度调节控件
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrightness } from '../hooks/useBrightness';

/**
 * 屏幕亮度调节控件
 * @description 读取当前屏幕亮度，并在滑动时通过主进程更新系统亮度
 * @returns 屏幕亮度调节元素
 */
export function BrightnessControl(): ReactElement {
  const { t } = useTranslation();
  const { brightness, isAvailable, handleBrightnessChange } = useBrightness();

  return (
    <div className="brightness-panel">
      <div className="timer-title-row">
        <div className="timer-title">
          <span className="text-[10px] text-[var(--color-island-text)] leading-tight">
            {t('hover.brightness.title', { defaultValue: '屏幕亮度' })}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-island-text)] opacity-60 leading-tight ml-2">
          {t('hover.brightness.hint', { defaultValue: '拖动调节' })}
        </span>
      </div>
      <div className="brightness-control-row">
        <input
          className="brightness-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={brightness}
          disabled={!isAvailable}
          onChange={handleBrightnessChange}
          aria-label={t('hover.brightness.sliderLabel', { defaultValue: '屏幕亮度' })}
        />
        <span className="brightness-value">
          {isAvailable ? `${brightness}%` : t('hover.brightness.unavailable', { defaultValue: '不可用' })}
        </span>
      </div>
    </div>
  );
}