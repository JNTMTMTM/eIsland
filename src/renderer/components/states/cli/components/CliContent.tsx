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
 * @file CliContent.tsx
 * @description CLI 状态内容组件 — 展示当前 Claude Code 或 Codex 会话的实时流事件
 * @author 鸡哥
 */

import '../../../../styles/cli/cli-state.css';
import { useCliContent } from '../hooks/useCliContent';
import { CliPermissionActions } from './CliPermissionActions';
import { CliStateActions } from './CliStateActions';
import { CliStateBody } from './CliStateBody';
import { CliStateLyric } from './CliStateLyric';
import type { ReactElement } from 'react';

/**
 * CLI 状态内容组件
 * @description 与 agent 态尺寸一致（500×88），左侧提供方图标 + 右侧最新流事件，点击进入完整面板。
 * @returns CLI 状态卡片
 */
export function CliContent(): ReactElement {
  const {
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
  } = useCliContent();

  return (
    <div className="cli-state-content">
      <img
        className={`cli-state-icon${provider === 'codex' ? ' cli-state-icon--codex' : ''}`}
        src={iconSrc}
        alt=""
        draggable={false}
      />
      <CliStateBody
        activeSession={activeSession}
        latestEvent={latestEvent}
        permissionCommand={permissionCommand}
        onOpenPanel={openPanel}
      />
      <CliStateActions provider={provider} onProviderChange={setProvider} onClose={close} />
      {provider === 'claude' && activeSession?.phase === 'waiting_permission' ? (
        <CliPermissionActions sessionId={activeSession.id} onResolve={resolvePermission} />
      ) : (
        isMusicPlaying && currentText && (
          <CliStateLyric
            key={currentIdx}
            currentLine={currentLine}
            currentText={currentText}
            hasSyllables={hasSyllables}
            karaokeEnabled={karaokeEnabled}
            currentPositionMs={currentPositionMs}
          />
        )
      )}
    </div>
  );
}
