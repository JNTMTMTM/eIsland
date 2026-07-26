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
 * @file TimeTab.tsx
 * @description 时间 Tab 内容组件
 * @author 鸡哥
 */

import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionButtons } from './ActionButtons';
import { CountdownEdit } from './CountdownEdit';
import { MediaButtons } from './MediaButtons';
import type { TimePanelMode, TimeTabProps } from '../types/timeTabTypes';

/**
 * 时间 Tab 内容
 * @description 显示当前时间、农历日期
 * @param props - 组件入参
 * @returns 时间 Tab 元素
 */
export function TimeTab({
  fullTimeStr,
  lunarStr
}: TimeTabProps): React.ReactElement {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState<TimePanelMode>('countdown');

  const handlePanelToggle = (panel: Exclude<TimePanelMode, 'countdown'>): void => {
    setActivePanel((current) => current === panel ? 'countdown' : panel);
  };

  return (
    <div className="time-tab-wrapper">
      <ActionButtons />
      <MediaButtons
        activePanel={activePanel}
        onPanelToggle={handlePanelToggle}
      />
      <CountdownEdit activePanel={activePanel} />
      <div className="time-tab-divider" />
      <div className="flex flex-col gap-1 text-right">
        <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
          {fullTimeStr}
        </span>
        <span className="text-xs text-[var(--color-island-text)] opacity-60">
          {t('hover.time.lunarPrefix', { defaultValue: '农历' })} {lunarStr}
        </span>
      </div>
    </div>
  );
}
