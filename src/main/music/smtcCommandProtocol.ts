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
 * @file smtcCommandProtocol.ts
 * @description SMTC 隔离命令请求和回应类型。
 * @author 鸡哥
 */

import type { CommandResult, TimestampInfo } from '@eisland/windows-smtc-helper';

export type SmtcCommandName = 'play' | 'pause' | 'next' | 'previous' | 'seek' | 'getTimestamp';
export type SmtcCommandResult = CommandResult | TimestampInfo;
export interface SmtcCommandRequest {
  type: 'command';
  requestId: number;
  command: SmtcCommandName;
  argument?: number;
  sourceAppId: string;
  deadline: number;
}
export interface SmtcCommandResponse {
  type: 'command-result';
  requestId: number;
  result: SmtcCommandResult;
}

/**
 * 创建与命令类型匹配的失败回应。
 * @param command - 原命令
 * @param reason - 失败原因
 * @returns 可安全传递至渲染进程的结果
 */
export function failedSmtcCommand(command: SmtcCommandName, reason: string): SmtcCommandResult {
  return command === 'getTimestamp'
    ? { isAvailable: false, playbackStatus: 'unknown', timeline: null }
    : { success: false, error: reason };
}
