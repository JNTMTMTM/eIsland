/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file codexScannerClient.ts
 * @description 复用一个扫描 Worker，关闭监视时释放解析缓存和线程。
 * @author 鸡哥
 */
import { Worker } from 'worker_threads';
import { join } from 'path';
import type { ParsedCodexSession } from './codexSessionParser';

/**
 * 创建延迟初始化的扫描器代理。
 * @returns 异步扫描与终止操作。
 */
export function createCodexScanner() {
  let worker: Worker | null = null;
  let pending: { resolve: (sessions: ParsedCodexSession[]) => void; reject: (reason: unknown) => void } | null = null;
  const stop = (): void => {
    pending?.reject(new Error('Codex scanner stopped'));
    pending = null;
    const previous = worker;
    worker = null;
    void previous?.terminate();
  };
  return {
    stop,
    scan: (paths: string[], now: number): Promise<ParsedCodexSession[]> => {
      if (!worker) {
        const created = new Worker(join(__dirname, 'codexWorker.js'));
        worker = created;
        created.on('message', (sessions: ParsedCodexSession[]) => {
          if (worker !== created) return;
          const request = pending;
          pending = null;
          request?.resolve(sessions);
        });
        created.on('error', (error) => {
          if (worker !== created) return;
          pending?.reject(error);
          pending = null;
          stop();
        });
        created.on('exit', () => { if (worker === created) stop(); });
      }
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        worker!.postMessage({ paths, now });
      });
    },
  };
}
