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
 * @file asyncControlDrainRuntime.test.ts
 * @description 实际异步控制器末次 await 与 finally 之间到达的滑块值不能丢失。
 * @author 鸡哥
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);

describe.each(['volume', 'brightness'])('%s 最后一个写入微任务', (kind) => {
  it('在原写循环完成但finally尚未执行时收到新值，继续排空并等待最后一次写入', async () => {
    const { createAsyncControl } = require(`../../eisland-windows-${kind}-helper/async-control.js`) as {
      createAsyncControl: (call: (args: string[]) => Promise<{ success: boolean }>, read: string, write: string) => { set: (value: number) => Promise<boolean> };
    };
    const calls: string[][] = [];
    let release!: (value: { success: boolean }) => void;
    const control = createAsyncControl((args) => {
      calls.push(args);
      return new Promise((resolve) => { release = resolve; });
    }, 'get', 'set');
    const first = control.set(1);
    await Promise.resolve();
    release({ success: true });
    let second: Promise<boolean> | undefined;
    queueMicrotask(() => { second = control.set(2); });
    await new Promise((resolve) => setImmediate(resolve));
    expect(calls).toEqual([['set', '1'], ['set', '2']]);
    let settled = false;
    void first.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    release({ success: true });
    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });
});
