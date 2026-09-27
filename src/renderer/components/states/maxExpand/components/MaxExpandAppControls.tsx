/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file MaxExpandAppControls.tsx
 * @description 应用化模式右侧控制条，提供返回应用导航页入口。
 * @author 鸡哥
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import type { MouseEvent, ReactElement } from 'react';

interface MaxExpandAppControlsProps {
  onBackToLauncher: () => void;
}

/**
 * 渲染应用化模式的统一竖向控制条。
 * @param props - 控制条属性。
 * @param props.onBackToLauncher - 返回应用导航页的回调。
 * @returns 包含返回按钮的导航控制条。
 */
export default function MaxExpandAppControls({ onBackToLauncher }: MaxExpandAppControlsProps): ReactElement {
  const { t } = useTranslation();
  const backLabel = t('maxExpand.appMode.backToLauncher');
  const handleBackToLauncher = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onBackToLauncher();
  }, [onBackToLauncher]);

  return (
    <nav className="max-expand-app-controls" aria-label={t('maxExpand.appMode.controls')}>
      <button className="max-expand-app-home-button"
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
