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
 * @file CliTab.tsx
 * @description Claude Code 与 Codex CLI 状态控制面板 — 简洁左右分栏布局
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useCliStatus } from '../hooks/useCliStatus';
import { useCliEvents } from '../hooks/useCliEvents';
import { useBulkSelect } from '../hooks/useBulkSelect';
import { useEventPagination } from '../hooks/useEventPagination';
import { usePendingPermissions } from '../hooks/usePendingPermissions';
import useIslandStore from '../../../../../../store/isLandStore';
import { EventStreamPanel } from './EventStreamPanel';
import { SessionSidebar } from './SessionSidebar';
import '../../../../../../styles/settings/modules/cli.css';

/**
 * Claude Code 与 Codex CLI 状态控制面板主组件
 * @returns CLI 面板 React 元素
 */
export function CliTab(): ReactElement {
  const { t } = useTranslation();
  const setCli = useIslandStore((s) => s.setCli);
  const provider = useIslandStore((s) => s.cliProvider);
  const setProvider = useIslandStore((s) => s.setCliProvider);
  const { snapshot, enableMonitor, disableMonitor, clearEvents, deleteSessions } = useCliStatus(provider);
  const {
    eventFilter,
    setEventFilter,
    selectedSession,
    selectedSessionId,
    setSelectedSessionId,
    activeSessions,
    filteredEvents,
  } = useCliEvents(snapshot);
  const {
    bulkSelectMode,
    selectedSessionIds,
    selectedSessionCount,
    handleToggleBulkSelect,
    handleToggleSessionSelection,
    handleDeleteSelectedSessions,
  } = useBulkSelect(snapshot.sessions, deleteSessions, selectedSessionId, setSelectedSessionId);
  const { setPage, totalPages, currentPage, pagedEvents } = useEventPagination(filteredEvents, eventFilter, selectedSessionId);
  const pendingPermissionEventIds = usePendingPermissions(snapshot.sessions);

  return (
    <div className="cli-tab" onClick={(e) => e.stopPropagation()}>
      <SessionSidebar
        t={t}
        provider={provider}
        sessions={snapshot.sessions}
        selectedSessionId={selectedSessionId}
        setSelectedSessionId={setSelectedSessionId}
        bulkSelectMode={bulkSelectMode}
        handleToggleBulkSelect={handleToggleBulkSelect}
        selectedSessionIds={selectedSessionIds}
        handleToggleSessionSelection={handleToggleSessionSelection}
        selectedSessionCount={selectedSessionCount}
        handleDeleteSelectedSessions={handleDeleteSelectedSessions}
      />
      <EventStreamPanel
        t={t}
        provider={provider}
        onProviderChange={setProvider}
        snapshot={snapshot}
        eventFilter={eventFilter}
        setEventFilter={setEventFilter}
        selectedSessionTitle={selectedSession?.title}
        filteredEvents={filteredEvents}
        pagedEvents={pagedEvents}
        pendingPermissionEventIds={pendingPermissionEventIds}
        totalPages={totalPages}
        currentPage={currentPage}
        setPage={setPage}
        enableMonitor={enableMonitor}
        disableMonitor={disableMonitor}
        clearEvents={clearEvents}
        setCli={setCli}
        activeSessionCount={activeSessions.length}
      />
    </div>
  );
}
