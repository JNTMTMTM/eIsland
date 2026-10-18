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
 * @file screenshotProcess.test.ts
 * @description 真实子进程配合可控截止时钟验证截图硬杀、取消、恢复与字节上限，不读取屏幕。
 * @author 鸡哥
 */
import { mkdtempSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { createScreenshotRunner } from '../screenshotRunner';

afterEach(() => { vi.useRealTimers(); });

it('已就绪的阻塞截图进程被硬杀，取消与字节超限后仍能恢复原始二进制响应', async () => {
  // 进程启动和管道事件保持真实；只有 runner 的截止时间由测试显式推进。
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const directory = mkdtempSync(join(tmpdir(), 'eisland-screenshot-deadline-'));
  const entry = join(directory, 'fixture.cjs');
  const pidFile = join(directory, 'pid');
  const pidTempFile = join(directory, 'pid.tmp');
  writeFileSync(entry, `
    if (process.argv[2] === 'primary') {
      const fs = require('node:fs');
      fs.writeFileSync(${JSON.stringify(pidTempFile)}, String(process.pid));
      fs.renameSync(${JSON.stringify(pidTempFile)}, ${JSON.stringify(pidFile)});
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    } else if (process.argv[2] === 'windows') {
      process.stdout.write(Buffer.alloc(2 * 1024 * 1024));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    } else process.stdout.end(Buffer.from([0, 255, 1, 2]));
  `);
  const runner = createScreenshotRunner(entry, 1000);
  const readiness = watch(directory);
  const ready = new Promise<void>((resolve, reject) => {
    readiness.on('change', (event, filename) => {
      if ((event === 'rename' || event === 'change') && filename === 'pid') resolve();
    });
    readiness.once('error', reject);
  });
  try {
    const pending = runner.run('primary');
    // 原子重命名就绪文件后再触发截止时间，不把系统调度慢误判为已运行的任务超时。
    await ready;
    readiness.close();
    const pid = Number(readFileSync(pidFile, 'utf8'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBeNull();
    expect(() => process.kill(pid, 0)).toThrow();
    expect(await runner.run('all')).toEqual(Buffer.from([0, 255, 1, 2]));
    const controller = new AbortController();
    const cancelled = runner.run('primary', controller.signal);
    controller.abort();
    expect(await cancelled).toBeNull();
    expect(await runner.run('windows')).toBeNull();
    expect(await runner.run('all')).toEqual(Buffer.from([0, 255, 1, 2]));
  } finally { readiness.close(); runner.dispose(); rmSync(directory, { recursive: true, force: true }); }
}, 30000);
