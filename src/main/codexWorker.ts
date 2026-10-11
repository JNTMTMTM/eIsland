/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file codexWorker.ts
 * @description 将日志读取、JSON 解析和历史去重隔离出 Electron 主线程。
 * @author 鸡哥
 */
import { parentPort } from 'worker_threads';
import { createCodexLogScanner } from './system/codexLogScanner';
const scanner = createCodexLogScanner();
parentPort?.on('message', ({ paths, now }: { paths: string[]; now: number }) => {
  scanner.retain(paths);
  const sessions = paths.flatMap((path) => {
    try { const parsed = scanner.scan(path, now); return parsed ? [parsed] : []; }
    catch { return []; }
  });
  parentPort?.postMessage(sessions);
});
