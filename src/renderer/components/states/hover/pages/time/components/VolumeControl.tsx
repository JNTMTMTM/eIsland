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
 * @file VolumeControl.tsx
 * @description Hover 时间页中的系统音量调节控件
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useVolume } from '../hooks/useVolume';

/**
 * 系统音量调节控件
 * @description 复用亮度面板布局，读取并更新当前默认播放设备的主音量
 * @returns 系统音量调节元素
 */
export function VolumeControl(): ReactElement {
  const { t } = useTranslation();
  const { volume, isAvailable, handleVolumeChange } = useVolume();

  return (
    <div className="brightness-panel">
      <div className="timer-title-row">
        <div className="timer-title">
          <span className="text-[10px] text-[var(--color-island-text)] leading-tight">
            {t('hover.volume.title', { defaultValue: '系统音量' })}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-island-text)] opacity-60 leading-tight ml-2">
          {t('hover.volume.hint', { defaultValue: '拖动调节' })}
        </span>
      </div>
      <div className="brightness-control-row">
        <input
          className="brightness-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          disabled={!isAvailable}
          onChange={handleVolumeChange}
          aria-label={t('hover.volume.sliderLabel', { defaultValue: '系统音量' })}
        />
        <span className="brightness-value">
          {isAvailable ? `${volume}%` : t('hover.volume.unavailable', { defaultValue: '不可用' })}
        </span>
      </div>
    </div>
  );
}