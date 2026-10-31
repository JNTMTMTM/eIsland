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
 * @file CliStateActions.tsx
 * @description CLI 状态右侧操作区：提供方切换与关闭按钮。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { CliProviderSwitch } from '../../maxExpand/components/cli/components/CliProviderSwitch';
import type { ReactElement } from 'react';
import type { CliStateActionsProps } from '../types/cliTypes';

/**
 * 渲染提供方切换与关闭按钮。
 * @param props - 组件入参
 * @param props.provider - 当前提供方
 * @param props.onProviderChange - 切换提供方
 * @param props.onClose - 关闭 CLI 状态
 * @returns 操作区
 */
export function CliStateActions({ provider, onProviderChange, onClose }: CliStateActionsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="cli-state-actions">
      <CliProviderSwitch provider={provider} onChange={onProviderChange} compact />
      <button type="button" className="cli-state-action-btn" onClick={onClose}>
        {t('agent.actions.close', { defaultValue: '关闭' })}
      </button>
    </div>
  );
}
