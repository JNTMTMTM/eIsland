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
 * @file MaxExpandAppControls.tsx
 * @description 应用化模式右侧控制条，顶部显示当前应用图标，底部提供返回应用导航页入口。
 * @author 鸡哥
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { MAX_EXPAND_APPS } from './app/config/appLauncherConfig';
import type { MouseEvent, ReactElement } from 'react';
import type { MaxExpandTab } from '../../../../store/types';

interface MaxExpandAppControlsProps {
  activeTab: MaxExpandTab;
  onBackToLauncher: () => void;
}

/**
 * 渲染应用化模式的统一竖向控制条。
 * @param props - 控制条属性。
 * @param props.activeTab - 当前应用标识，用于显示对应图标与名称。
 * @param props.onBackToLauncher - 返回应用导航页的回调。
 * @returns 包含当前应用图标与返回按钮的导航控制条。
 */
export default function MaxExpandAppControls({ activeTab, onBackToLauncher }: MaxExpandAppControlsProps): ReactElement {
  const { t } = useTranslation();
  const appLabel = t(`maxExpand.nav.${activeTab}`);
  const backLabel = t('maxExpand.appMode.backToLauncher');
  const handleBackToLauncher = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onBackToLauncher();
  }, [onBackToLauncher]);

  return (
    <nav className="max-expand-app-controls" aria-label={t('maxExpand.appMode.controls')}>
      <span className="max-expand-app-control" title={appLabel}>
        <img className="max-expand-app-control-icon-img" src={MAX_EXPAND_APPS[activeTab].icon} alt={appLabel} draggable={false} />
      </span>
      <button className="max-expand-app-control max-expand-app-home-button"
        type="button"
        title={backLabel}
        aria-label={backLabel}
        onClick={handleBackToLauncher}
      >
        <img className="max-expand-app-control-icon-img" src={SvgIcon.LAYOUT} alt="" draggable={false} />
      </button>
    </nav>
  );
}
