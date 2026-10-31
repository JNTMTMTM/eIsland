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
 * @file CliStateBody.tsx
 * @description CLI 状态主体：会话标题、阶段与事件标签，以及待授权命令或最新事件摘要，点击进入完整面板。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { phaseLabel } from '../../maxExpand/components/cli/utils/cliFormatters';
import type { ReactElement } from 'react';
import type { CliStateBodyProps } from '../types/cliTypes';

/**
 * 渲染 CLI 状态主体。
 * @param props - 组件入参
 * @param props.activeSession - 活跃会话
 * @param props.latestEvent - 最新流事件
 * @param props.permissionCommand - 待授权命令
 * @param props.onOpenPanel - 进入完整面板
 * @returns 状态主体按钮
 */
export function CliStateBody({ activeSession, latestEvent, permissionCommand, onOpenPanel }: CliStateBodyProps): ReactElement {
  const { t } = useTranslation();
  const title = activeSession?.title || t('maxExpand.cli.sessions', { defaultValue: '会话' });
  const phaseText = activeSession ? phaseLabel(activeSession.phase, t) : '';

  return (
    <button type="button" className="cli-state-body" onClick={onOpenPanel}>
      <span className="cli-state-title-row">
        <span className="cli-state-title">{title}</span>
        {phaseText && <span className={`cli-state-phase ${activeSession?.phase ?? ''}`}>{phaseText}</span>}
        {latestEvent && <span className="cli-state-phase cli-state-event-tag">{latestEvent.eventName}</span>}
      </span>
      {permissionCommand ? (
        <span className="cli-state-command">
          <span className="cli-state-command-line">
            {permissionCommand.toolName && <span className="cli-state-command-tool">{permissionCommand.toolName}</span>}
            {permissionCommand.command && <code className="cli-state-command-text">{permissionCommand.command}</code>}
          </span>
          {permissionCommand.description && <span className="cli-state-command-desc">{permissionCommand.description}</span>}
        </span>
      ) : (
        <span className="cli-state-event">
          {latestEvent
            ? (latestEvent.summary && <span className="cli-state-event-summary">{latestEvent.summary}</span>)
            : <span className="cli-state-event-summary">{t('maxExpand.cli.emptyEvents', { defaultValue: '暂无事件' })}</span>}
        </span>
      )}
    </button>
  );
}
