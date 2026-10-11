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
 * @description 离线真实子进程验证截图硬超时、取消、单任务与字节上限，不读取屏幕。
 * @author 鸡哥
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createScreenshotRunner } from '../screenshotRunner';

it('阻塞截图进程被硬杀，重复请求不堆积，后续截图恢复且二进制保持不变', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-screenshot-deadline-'));
  const entry = join(directory, 'fixture.cjs');
  const pidFile = join(directory, 'pid');
  writeFileSync(entry, `
    if (process.argv[2] === 'primary') {
      require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    } else if (process.argv[2] === 'windows') {
      process.stdout.write(Buffer.alloc(2 * 1024 * 1024));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    } else process.stdout.end(Buffer.from([0, 255, 1, 2]));
  `);
  const runner = createScreenshotRunner(entry, 1000);
  try {
    const pending = runner.run('primary');
    const queued = runner.run('all');
    expect(await runner.run('all')).toBeNull();
    expect(await pending).toBeNull();
    await queued;
    const pid = Number(readFileSync(pidFile, 'utf8'));
    expect(() => process.kill(pid, 0)).toThrow();
    expect(await runner.run('all')).toEqual(Buffer.from([0, 255, 1, 2]));
    const controller = new AbortController();
    const cancelled = runner.run('primary', controller.signal);
    controller.abort();
    expect(await cancelled).toBeNull();
    expect(await runner.run('windows')).toBeNull();
    expect(await runner.run('all')).toEqual(Buffer.from([0, 255, 1, 2]));
  } finally { runner.dispose(); rmSync(directory, { recursive: true, force: true }); }
}, 7000);

it('主屏与选区任务交错时等待一个槽位，不把忙碌误判为原生失败', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-screenshot-queue-'));
  const entry = join(directory, 'fixture.cjs');
  writeFileSync(entry, `setTimeout(() => process.stdout.end(Buffer.from(process.argv[2])), 50);`);
  const runner = createScreenshotRunner(entry, 3000);
  try {
    const windows = runner.run('windows');
    const primary = runner.run('primary');
    expect(await windows).toEqual(Buffer.from('windows'));
    const all = runner.run('all');
    expect(await primary).toEqual(Buffer.from('primary'));
    expect(await all).toEqual(Buffer.from('all'));
    const active = runner.run('windows');
    const controller = new AbortController();
    let copied = false;
    const encoding = runner.run('encode', controller.signal, () => {
      copied = true; return { data: Buffer.alloc(4), width: 1, height: 1 };
    });
    controller.abort();
    expect(await encoding).toBeNull();
    expect(copied).toBe(false);
    await active;
  } finally { runner.dispose(); rmSync(directory, { recursive: true, force: true }); }
}, 7000);
