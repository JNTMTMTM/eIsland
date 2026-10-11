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
 * @file smtcCommandProcess.test.ts
 * @description 使用离线 Node 子进程验证挂起调用的硬终止和后续重建，不加载原生控制。
 * @author 鸡哥
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createSmtcCommandBroker } from '../smtcCommandBroker';
import type { SmtcCommandResponse } from '../smtcCommandProtocol';

it('真实挂起子进程在 deadline 被终止，后续请求通过新进程完成', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-smtc-deadline-'));
  const entry = join(directory, 'offline.cjs');
  const pidFile = join(directory, 'pid.txt');
  writeFileSync(entry, `process.on('message', request => {
    if (request.argument === 1) {
      require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    } else process.send({ type: 'command-result', requestId: request.requestId, result: { success: true, error: null } });
  });`);
  const broker = createSmtcCommandBroker(entry);
  try {
    const first = new Promise<SmtcCommandResponse>((reply) => broker.execute({ type: 'command', requestId: 1, command: 'seek', argument: 1, sourceAppId: '', deadline: Date.now() + 1000 }, reply));
    const second = new Promise<SmtcCommandResponse>((reply) => broker.execute({ type: 'command', requestId: 2, command: 'seek', argument: 2, sourceAppId: '', deadline: Date.now() + 4000 }, reply));
    expect((await first).result).toMatchObject({ success: false });
    expect((await second).result).toMatchObject({ success: true });
    const pid = Number(readFileSync(pidFile, 'utf8'));
    let alive = true;
    for (let i = 0; i < 20 && alive; i += 1) {
      try { process.kill(pid, 0); await new Promise((resolve) => setTimeout(resolve, 20)); }
      catch { alive = false; }
    }
    expect(alive).toBe(false);
  } finally { broker.dispose(); rmSync(directory, { recursive: true, force: true }); }
}, 7000);
