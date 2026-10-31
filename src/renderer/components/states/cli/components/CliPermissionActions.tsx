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
 * @file CliPermissionActions.tsx
 * @description Claude Code 等待授权时的拒绝、批准与永久批准按钮。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { CLI_PERMISSION_OPTIONS } from '../config/cliConfig';
import type { ReactElement } from 'react';
import type { CliPermissionActionsProps } from '../types/cliTypes';

/**
 * 渲染授权按钮。
 * @param props - 组件入参
 * @param props.sessionId - 待授权会话 ID
 * @param props.onResolve - 提交授权决定
 * @returns 授权按钮组
 */
export function CliPermissionActions({ sessionId, onResolve }: CliPermissionActionsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="cli-state-permission">
      {CLI_PERMISSION_OPTIONS.map((option) => (
        <button
          key={option.decision}
          type="button"
          className={`cli-state-permission-btn cli-state-permission-${option.decision}`}
          onClick={() => onResolve(sessionId, option.decision)}
        >
          {t(option.labelKey, { defaultValue: option.defaultLabel })}
        </button>
      ))}
    </div>
  );
}
