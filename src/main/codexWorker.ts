/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file codexWorker.ts
 * @description 将日志读取、JSON 解析和历史去重隔离出 Electron 主线程。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
import { parentPort, workerData } from 'worker_threads';
import { migrateCliState } from './system/cliStateMigration';
import { createCodexLogScanner } from './system/codexLogScanner';
if (workerData?.task === 'migrateClaude') {
  parentPort?.postMessage(migrateCliState(workerData.path, workerData.directory));
  parentPort?.close();
} else {
  const scanner = createCodexLogScanner();
  parentPort?.on('message', ({ paths, now }: { paths: string[]; now: number }) => {
    scanner.retain(paths);
    const sessions = paths.flatMap((path) => {
      try { const parsed = scanner.scan(path, now); return parsed ? [parsed] : []; }
      catch { return []; }
    });
    parentPort?.postMessage(sessions);
  });
}
