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
 * @file ActionButtons.tsx
 * @description 隐藏与退出灵动岛的操作按钮组件
 * @author 鸡哥
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';

interface ActionButtonsProps {
  /** 隐藏图标路径 */
  hideIcon?: string;
  /** 退出图标路径 */
  powerOffIcon?: string;
}

/**
 * 操作按钮组件
 * @description 提供隐藏灵动岛和退出应用两个功能按钮
 */
export function ActionButtons({
  hideIcon = SvgIcon.HIDE,
  powerOffIcon = SvgIcon.POWER_OFF,
}: ActionButtonsProps): React.ReactElement {
  const { t } = useTranslation();

  const handleHide = (): void => {
    window.api.collapseWindow();
    window.api?.hideWindow();
  };

  const handleQuit = (): void => {
    window.api.quitApp();
  };

  return (
    <div className="action-buttons">
      <button
        className="action-btn"
        onClick={handleHide}
        title={t('hover.actions.hideIsland', { defaultValue: '隐藏灵动岛' })}
        aria-label={t('hover.actions.hideIsland', { defaultValue: '隐藏灵动岛' })}
      >
        <img src={hideIcon} alt={t('hover.actions.hide', { defaultValue: '隐藏' })} className="action-btn-icon" />
      </button>
      <button
        className="action-btn"
        onClick={handleQuit}
        title={t('hover.actions.quitIsland', { defaultValue: '退出灵动岛' })}
        aria-label={t('hover.actions.quitIsland', { defaultValue: '退出灵动岛' })}
      >
        <img src={powerOffIcon} alt={t('hover.actions.quit', { defaultValue: '退出' })} className="action-btn-icon" />
      </button>
    </div>
  );
}
