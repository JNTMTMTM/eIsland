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
 * @file SessionSidebar.tsx
 * @description CLI 面板左侧会话列表侧边栏
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { SessionSidebarProps } from '../types/types';
import { phaseLabel, permissionProjectLabel } from '../utils/cliFormatters';
import { SvgIcon, AgentIcon } from '../../../../../../utils/SvgIcon';

/**
 * CLI 面板左侧会话列表
 * @param props - 组件属性
 * @returns 会话列表 React 元素
 */
export function SessionSidebar({
  t,
  provider,
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  bulkSelectMode,
  handleToggleBulkSelect,
  selectedSessionIds,
  handleToggleSessionSelection,
  selectedSessionCount,
  handleDeleteSelectedSessions,
}: SessionSidebarProps): ReactElement {
  return (
    <div className="cli-tab-sidebar">
      <div className="cli-tab-sidebar-header">
        <button
          className={`cli-tab-bulk-select-toggle ${bulkSelectMode ? 'cli-tab-bulk-select-toggle--active' : ''}`}
          type="button"
          onClick={handleToggleBulkSelect}
          title={bulkSelectMode ? t('maxExpand.cli.cancelSelection', { defaultValue: '取消选择' }) : t('maxExpand.cli.bulkSelect', { defaultValue: '批量选择' })}
          aria-label={bulkSelectMode ? t('maxExpand.cli.cancelSelection', { defaultValue: '取消选择' }) : t('maxExpand.cli.bulkSelect', { defaultValue: '批量选择' })}
        >
          <img className="cli-tab-checked-icon-img" src={SvgIcon.CHECKED} alt="" width="14" height="14" draggable={false} />
        </button>
        <span className="cli-tab-sidebar-title">{t('maxExpand.cli.sessions', { defaultValue: '会话' })}</span>
        <button
          className={`cli-tab-sidebar-count ${selectedSessionId === null ? 'active' : ''}`}
          type="button"
          title={t('maxExpand.cli.allSessions', { defaultValue: '全部会话' })}
          onClick={() => setSelectedSessionId(null)}
        >
          {t('maxExpand.cli.allLabel', { defaultValue: 'all' })}
        </button>
      </div>
      <div className={`cli-tab-bulk-actions ${bulkSelectMode ? 'cli-tab-bulk-actions--open' : ''}`} aria-hidden={!bulkSelectMode}>
        <span className="cli-tab-bulk-selected-count">
          {t('maxExpand.cli.selectedCount', { defaultValue: '已选 {{count}} 项', count: selectedSessionCount })}
        </span>
        <button
          className="cli-tab-bulk-delete"
          type="button"
          onClick={handleDeleteSelectedSessions}
          disabled={!bulkSelectMode || selectedSessionCount === 0}
          tabIndex={bulkSelectMode ? 0 : -1}
        >
          {t('maxExpand.cli.deleteSelected', { defaultValue: '删除所选' })}
        </button>
        <button className="cli-tab-bulk-cancel" type="button" onClick={handleToggleBulkSelect} tabIndex={bulkSelectMode ? 0 : -1}>
          {t('maxExpand.cli.cancelSelection', { defaultValue: '取消选择' })}
        </button>
      </div>
      <div className="cli-tab-session-list">
        {sessions.length === 0 && (
          <div className="cli-tab-empty">{t('maxExpand.cli.emptySessions', { defaultValue: '暂无会话' })}</div>
        )}
        {sessions.map((session) => {
          const sessionSelected = selectedSessionIds.has(session.id);
          return (
            <button
              key={session.id}
              className={`cli-tab-session-item ${selectedSessionId === session.id ? 'active' : ''} ${bulkSelectMode ? 'cli-tab-session-item--selectable' : ''} ${sessionSelected ? 'cli-tab-session-item--selected' : ''}`}
              type="button"
              onClick={() => {
                if (bulkSelectMode) {
                  handleToggleSessionSelection(session.id);
                  return;
                }
                setSelectedSessionId(session.id);
              }}
            >
              <span className={`cli-tab-session-item-check ${sessionSelected ? 'cli-tab-session-item-check--checked' : ''}`} aria-hidden="true">
                {sessionSelected && <img className="cli-tab-checked-icon-img" src={SvgIcon.CHECKED} alt="" width="10" height="10" draggable={false} />}
              </span>
              <div className="cli-tab-session-top">
                <img
                  className={`cli-tab-session-icon${provider === 'codex' ? ' cli-tab-session-icon--codex' : ''}`}
                  src={provider === 'codex' ? AgentIcon.CODEX : AgentIcon.CLAUDE}
                  alt=""
                  width="18"
                  height="18"
                  draggable={false}
                />
                <span className="cli-tab-session-title">{session.title}</span>
                <span className={`cli-tab-phase ${session.phase}`}>{phaseLabel(session.phase, t)}</span>
              </div>
              <div className="cli-tab-session-path">{session.cwd ?? session.transcriptPath ?? session.id}</div>
              {session.pendingPermission && (
                <div className="cli-tab-permission" title={session.pendingPermission.summary}>
                  <span className="cli-tab-permission-text">{permissionProjectLabel(session.pendingPermission, t)}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
