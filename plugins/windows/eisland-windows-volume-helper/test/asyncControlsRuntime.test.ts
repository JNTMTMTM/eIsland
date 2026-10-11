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
 * @file asyncControls.test.ts
 * @description 离线验证亮度音量异步子进程、读取去重、末值队列与失败恢复。
 * @author 鸡哥
 */
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';

let fixture: NativeRuntimeFixture | null = null;
afterEach(() => { fixture?.dispose(); fixture = null; vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(['volume', 'brightness'])('%s 异步控制', (kind) => {
  it('读取共享一个异步进程并短期缓存，写入只发送最后目标', async () => {
    vi.useFakeTimers();
    const callbacks: Array<(error: Error | null, stdout: string) => void> = [];
    const asyncExec = vi.fn((_path: string, _args: string[], _options: unknown, done: (error: Error | null, stdout: string) => void) => { callbacks.push(done); });
    const sync = vi.fn(() => { throw new Error('Synchronous helper must not run'); });
    const file = fileURLToPath(new URL(`../../eisland-windows-${kind}-helper/index.js`, import.meta.url));
    fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([
      ['node:fs', { existsSync: () => true }], ['node:child_process', { execFile: asyncExec, spawnSync: sync }],
    ]));
    const api = fixture.read<Record<string, (...args: number[]) => Promise<unknown>>>();
    const title = kind === 'volume' ? 'Volume' : 'Brightness';
    const get = api[`get${title}Async`]; const set = api[`set${title}Async`];
    const first = get(); const second = get();
    expect(asyncExec).toHaveBeenCalledOnce();
    expect(asyncExec.mock.calls[0][2]).toMatchObject({ timeout: 5000, windowsHide: true, maxBuffer: 65536 });
    let ticked = false;
    setTimeout(() => { ticked = true; }, 10);
    await vi.advanceTimersByTimeAsync(10);
    expect(ticked).toBe(true); // helper 未返回时 JS 计时器仍然运行。
    callbacks.shift()!(null, kind === 'volume' ? '{"level":20}' : '{"currentBrightness":20}');
    await Promise.all([first, second]); await get();
    expect(asyncExec).toHaveBeenCalledOnce();
    const writes = [set(30), set(40), set(50)];
    await vi.advanceTimersByTimeAsync(0);
    expect(asyncExec.mock.calls.at(-1)?.[1]).toEqual(['set', '50']);
    writes.push(set(60), set(70));
    callbacks.shift()!(null, '{"success":true}');
    await vi.advanceTimersByTimeAsync(0);
    expect(asyncExec.mock.calls.at(-1)?.[1]).toEqual(['set', '70']);
    callbacks.shift()!(null, '{"success":true}');
    expect(await Promise.all(writes)).toEqual([true, true, true, true, true]);
    expect(asyncExec).toHaveBeenCalledTimes(3);
    expect(sync).not.toHaveBeenCalled();
    const failed = get(); callbacks.shift()!(new Error('timeout'), '');
    expect(await failed).toBeNull();
    await vi.advanceTimersByTimeAsync(251);
    const recovered = get(); callbacks.shift()!(null, kind === 'volume' ? '{"level":70}' : '{"currentBrightness":70}');
    expect(await recovered).toEqual(kind === 'volume' ? 70 : { currentBrightness: 70 });
  });
});
