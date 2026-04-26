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
 * @file ToolButtons.tsx
 * @description 截图和任务管理器工具按钮组件
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';

type HoverScreenshotMode = 'region' | 'display';

const HOVER_SCREENSHOT_MODE_STORE_KEY = 'hover-screenshot-mode';

/**
 * 工具按钮组件
 * @description 提供截图和打开任务管理器两个功能按钮
 */
export function ToolButtons(): React.ReactElement {
  const { t } = useTranslation();
  const [screenshotMode, setScreenshotMode] = useState<HoverScreenshotMode>('region');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(HOVER_SCREENSHOT_MODE_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (value === 'display') {
        setScreenshotMode('display');
        return;
      }
      setScreenshotMode('region');
    }).catch(() => {
      if (cancelled) return;
      setScreenshotMode('region');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      if (screenshotMode === 'region') {
        await window.api.startRegionScreenshot();
        return;
      }
      const base64 = await window.api.screenshot();
      if (base64) {
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = `data:image/png;base64,${base64}`;
        link.click();
      }
    } catch (err) {
      console.error('[ToolButtons] screenshot error:', err);
    }
  }, [screenshotMode]);

  const handleTaskManager = useCallback(() => {
    window.api.openTaskManager();
  }, []);

  return (
    <div className="timer-tools">
      <button className="action-btn" onClick={handleScreenshot} title={t('hover.tools.screenshot', { defaultValue: '截图' })}>
        <img src={SvgIcon.SCREENSHOT} alt={t('hover.tools.screenshot', { defaultValue: '截图' })} className="action-btn-icon" />
      </button>
      <button className="action-btn" onClick={handleTaskManager} title={t('hover.tools.taskManager', { defaultValue: '任务管理器' })}>
        <img src={SvgIcon.TASK_MANAGER} alt={t('hover.tools.taskManager', { defaultValue: '任务管理器' })} className="action-btn-icon" />
      </button>
    </div>
  );
}
