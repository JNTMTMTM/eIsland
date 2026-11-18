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
 * @file useCliEvents.ts
 * @description CLI 事件筛选与活跃会话派生 Hook
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import type { CliStatusSnapshot } from '../types/types';
import type { CliEventFilter } from '../config/cliFilters';
import { matchesFilter } from '../utils/cliFormatters';

/** 返回事件筛选状态、活跃会话列表和筛选后的事件列表 */
export function useCliEvents(snapshot: CliStatusSnapshot) {
  const [eventFilter, setEventFilter] = useState<CliEventFilter>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const activeSessions = useMemo(() => snapshot.enabled ? snapshot.sessions.filter((s) => s.phase !== 'completed') : [], [snapshot.enabled, snapshot.sessions]);
  const selectedSession = useMemo(
    () => snapshot.sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, snapshot.sessions],
  );

  useEffect(() => {
    if (selectedSessionId && !snapshot.sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(null);
    }
  }, [selectedSessionId, snapshot.sessions]);

  const filteredEvents = useMemo(
    () => {
      const events = selectedSession?.events?.length
        ? selectedSession.events
        : snapshot.events.filter((event) => !selectedSessionId || event.sessionId === selectedSessionId);
      return events.filter((event) => matchesFilter(event, eventFilter));
    },
    [eventFilter, selectedSession, selectedSessionId, snapshot.events],
  );

  return {
    eventFilter,
    setEventFilter,
    selectedSession,
    selectedSessionId,
    setSelectedSessionId,
    activeSessions,
    filteredEvents,
  };
}
