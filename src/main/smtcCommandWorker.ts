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
 * @file smtcCommandWorker.ts
 * @description 仅在媒体控制期间存在的可终止 SMTC 命令进程。
 * @author 鸡哥
 */

import { play, pause, next, previous, seek, getTimestamp, setCommandSource } from '@eisland/windows-smtc-helper';
import { failedSmtcCommand, type SmtcCommandRequest, type SmtcCommandResponse } from './music/smtcCommandProtocol';

const commands = { play, pause, next, previous, getTimestamp };
process.on('message', (request: SmtcCommandRequest) => {
  if (request.type !== 'command') return;
  let result;
  try {
    if (request.deadline <= Date.now()) throw new Error('Command expired');
    setCommandSource(request.sourceAppId);
    if (request.command === 'seek') {
      if (!Number.isFinite(request.argument)) throw new Error('Invalid seek position');
      result = seek(request.argument!);
    } else {
      result = commands[request.command]();
    }
  } catch (error) {
    result = failedSmtcCommand(request.command, error instanceof Error ? error.message : 'Command failed');
  } finally { setCommandSource(''); }
  const response: SmtcCommandResponse = { type: 'command-result', requestId: request.requestId, result };
  if (process.connected) process.send?.(response);
});
process.on('disconnect', () => process.exit(0));
