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
 * @file downloadWallpaper.test.ts
 * @description 为受控本地图片和字体提供有界授权 URL 与文件流。
 * @author 鸡哥
 */

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import downloadWallpaper from '../downloadWallpaper';
const fetch = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ net: { fetch } }));
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'eisland-download-test-')); });
afterEach(async () => { vi.useRealTimers(); if (directory.startsWith(join(tmpdir(), 'eisland-download-test-'))) await rm(directory, { recursive: true, force: true }); });
it('writes chunks without a whole-body arrayBuffer and atomically removes the temporary file', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1, 2])); controller.enqueue(new Uint8Array([3, 4])); controller.close(); } });
  const response = new Response(body);
  const arrayBuffer = vi.spyOn(response, 'arrayBuffer'); fetch.mockResolvedValue(response);
  const target = join(directory, 'result.png');
  expect(await downloadWallpaper('https://wallpaper.invalid', () => target, 4)).toBe(target);
  expect(await readFile(target)).toEqual(Buffer.from([1, 2, 3, 4]));
  expect(arrayBuffer).not.toHaveBeenCalled(); expect(await readdir(directory)).toEqual(['result.png']);
});
it('limits actual bytes without trusting headers and cleans failed downloads', async () => {
  fetch.mockResolvedValue(new Response(new Uint8Array(20), { headers: { 'Content-Length': '1' } }));
  await expect(downloadWallpaper('https://wallpaper.invalid', () => join(directory, 'large.png'), 10)).rejects.toThrow('size limit');
  expect(await readdir(directory)).toEqual([]);
});
it('aborts a response that never arrives at the deadline', async () => {
  vi.useFakeTimers();
  fetch.mockImplementation((_url, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const pending = downloadWallpaper('https://wallpaper.invalid', () => join(directory, 'slow.png'), 10);
  const assertion = expect(pending).rejects.toThrow('aborted');
  await vi.advanceTimersByTimeAsync(30_000); await assertion;
  expect(vi.getTimerCount()).toBe(0); expect(await readdir(directory)).toEqual([]);
});
