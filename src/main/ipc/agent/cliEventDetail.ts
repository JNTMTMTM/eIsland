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
/** @file cliEventDetail.ts
 * @description 只解析当前快照允许的事件引用，分页详情不接收外部文件路径。
 * @author 鸡哥
 */
import { app } from 'electron';
import { join } from 'path';
import type { ClaudeCodeStatusSnapshot } from '../../types/system/ClaudeCodeStatusSnapshot';
import { cliDetailPath, readCliDetailPage } from '../../system/cliEventDetails';

/** 按 ID 查找被保留事件，并从其原始日志或详情文件读取一个有界页面。 */
export async function getCliEventDetail(snapshot: ClaudeCodeStatusSnapshot, id: string, offset = 0) {
  const event = snapshot.events.find((item) => item.id === id)
    ?? snapshot.sessions.flatMap((session) => session.events).find((item) => item.id === id);
  if (!event) throw new Error('CLI event is no longer available');
  if (event.detailProvider === 'codex' && event.transcriptPath && event.detailSource) {
    return readCliDetailPage(event.transcriptPath, offset, event.detailSource);
  }
  const directory = join(app.getPath('userData'), 'eIsland_store', 'cli-details');
  return readCliDetailPage(cliDetailPath(directory, event.id), offset);
}
