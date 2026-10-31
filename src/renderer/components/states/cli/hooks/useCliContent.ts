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
 * @file useCliContent.ts
 * @description CLI 状态的会话订阅、活跃会话推导、歌词同步与面板、关闭、授权操作。
 * @author 鸡哥
 */

import { useMemo } from 'react';
import useIslandStore from '../../../../store/isLandStore';
import { useCurrentLyric } from '../../lyrics/hooks/useCurrentLyric';
import { useLyricsSettings } from '../../lyrics/hooks/useLyricsSettings';
import { useCliStatus } from '../../maxExpand/components/cli/hooks/useCliStatus';
import { CLI_PANEL_TAB } from '../config/cliConfig';
import { extractPermissionCommand, resolveStateIcon, selectActiveSession } from '../utils/cliUtils';
import type { CliPermissionDecision, UseCliContentReturn } from '../types/cliTypes';

/**
 * 汇总 CLI 状态卡片所需的会话、歌词与操作。
 * @returns 活跃会话、最新事件、图标、待授权命令、歌词状态与操作回调
 */
export function useCliContent(): UseCliContentReturn {
  const setIdle = useIslandStore((s) => s.setIdle);
  const setMaxExpand = useIslandStore((s) => s.setMaxExpand);
  const setMaxExpandTab = useIslandStore((s) => s.setMaxExpandTab);
  const provider = useIslandStore((s) => s.cliProvider);
  const setProvider = useIslandStore((s) => s.setCliProvider);
  const { snapshot } = useCliStatus(provider);

  // 同步当前播放歌曲的动态歌词
  const isMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const syncedLyrics = useIslandStore((s) => s.syncedLyrics);
  const lyricsLoading = useIslandStore((s) => s.lyricsLoading);
  const currentPositionMs = useIslandStore((s) => s.currentPositionMs);
  const { currentIdx, currentLine, currentText, hasSyllables } = useCurrentLyric(syncedLyrics, lyricsLoading, currentPositionMs);
  const { karaokeEnabled } = useLyricsSettings();

  const { activeSession, latestEvent } = useMemo(
    () => selectActiveSession(snapshot),
    [snapshot.sessions, snapshot.events],
  );

  const permissionCommand = useMemo(() => extractPermissionCommand(activeSession), [activeSession]);

  const openPanel = (): void => {
    setMaxExpandTab(CLI_PANEL_TAB);
    setMaxExpand();
  };

  const close = (): void => setIdle(true);

  const iconSrc = resolveStateIcon(provider, activeSession, latestEvent);

  const resolvePermission = (sessionId: string, decision: CliPermissionDecision): void => {
    void window.api.claudeCodePermissionResolve(sessionId, decision);
  };

  return {
    provider,
    setProvider,
    activeSession,
    latestEvent,
    iconSrc,
    permissionCommand,
    isMusicPlaying,
    currentIdx,
    currentLine,
    currentText,
    hasSyllables,
    karaokeEnabled,
    currentPositionMs,
    openPanel,
    close,
    resolvePermission,
  };
}
