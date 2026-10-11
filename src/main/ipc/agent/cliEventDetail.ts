/* eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com. GPL-3.0-or-later.
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
