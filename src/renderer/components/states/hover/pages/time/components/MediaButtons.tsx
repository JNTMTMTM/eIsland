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
 * @file MediaButtons.tsx
 * @description 亮度和音量调节按钮组件
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';

interface MediaButtonsProps {
  isBrightnessActive: boolean;
  onBrightnessToggle: () => void;
}

/**
 * 媒体调节按钮组件
 * @description 提供亮度调节入口和音量占位按钮
 * @param props - 亮度面板状态与切换回调
 * @returns 媒体调节按钮元素
 */
export function MediaButtons({
  isBrightnessActive,
  onBrightnessToggle,
}: MediaButtonsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="media-buttons">
      <button
        className="action-btn"
        onClick={onBrightnessToggle}
        title={t('hover.media.brightness', { defaultValue: '亮度' })}
        aria-label={t('hover.media.brightness', { defaultValue: '亮度' })}
        aria-pressed={isBrightnessActive}
      >
        <img src={SvgIcon.BRIGHTNESS} alt={t('hover.media.brightness', { defaultValue: '亮度' })} className="action-btn-icon" />
      </button>
      <button
        className="action-btn"
        title={t('hover.media.volume', { defaultValue: '音量' })}
        aria-label={t('hover.media.volume', { defaultValue: '音量' })}
      >
        <img src={SvgIcon.VOLUME} alt={t('hover.media.volume', { defaultValue: '音量' })} className="action-btn-icon" />
      </button>
    </div>
  );
}
