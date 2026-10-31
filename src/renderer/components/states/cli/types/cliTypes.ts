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
 * @file cliTypes.ts
 * @description CLI 状态的活跃会话、待授权命令、授权选项、子组件入参与 hook 返回值类型。
 * @author 鸡哥
 */

import type { CliProvider, SyncedLyricLine } from '../../../../store/types';
import type { CliHookEvent, CliSessionSnapshot } from '../../maxExpand/components/cli/types/types';

/** Claude Code 授权决定 */
export type CliPermissionDecision = 'deny' | 'allow' | 'always';

/** 授权按钮配置 */
export interface CliPermissionOption {
  decision: CliPermissionDecision;
  labelKey: string;
  defaultLabel: string;
}

/** 最近活跃会话及其最新流事件 */
export interface CliActiveSelection {
  activeSession: CliSessionSnapshot | null;
  latestEvent: CliHookEvent | null;
}

/** 等待授权时展示的命令 */
export interface CliPermissionCommand {
  command: string;
  description: string;
  toolName: string;
}

/** useCliContent hook 返回值类型 */
export interface UseCliContentReturn extends CliActiveSelection {
  provider: CliProvider;
  setProvider: (provider: CliProvider) => void;
  iconSrc: string;
  permissionCommand: CliPermissionCommand | null;
  isMusicPlaying: boolean;
  currentIdx: number;
  currentLine: SyncedLyricLine | null;
  currentText: string;
  hasSyllables: boolean;
  karaokeEnabled: boolean;
  currentPositionMs: number;
  openPanel: () => void;
  close: () => void;
  resolvePermission: (sessionId: string, decision: CliPermissionDecision) => void;
}

/** CliStateBody 组件入参 */
export interface CliStateBodyProps extends CliActiveSelection {
  permissionCommand: CliPermissionCommand | null;
  onOpenPanel: () => void;
}

/** CliStateActions 组件入参 */
export interface CliStateActionsProps {
  provider: CliProvider;
  onProviderChange: (provider: CliProvider) => void;
  onClose: () => void;
}

/** CliPermissionActions 组件入参 */
export interface CliPermissionActionsProps {
  sessionId: string;
  onResolve: (sessionId: string, decision: CliPermissionDecision) => void;
}

/** CliStateLyric 组件入参 */
export interface CliStateLyricProps {
  currentLine: SyncedLyricLine | null;
  currentText: string;
  hasSyllables: boolean;
  karaokeEnabled: boolean;
  currentPositionMs: number;
}
