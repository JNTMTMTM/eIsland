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
 * @file localAssets.test.ts
 * @description 为受控本地图片和字体提供有界授权 URL 与文件流。
 * @author 鸡哥
 */

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createLocalAssetUrl, handleLocalAssetRequest } from '../localAssets';
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'eisland-assets-test-')); });
afterEach(async () => { if (directory.startsWith(join(tmpdir(), 'eisland-assets-test-'))) await rm(directory, { recursive: true, force: true }); });
it('streams binary image/font data through a short URL and validates grant methods and paths', async () => {
  const file = join(directory, 'font.ttf'); const bytes = Buffer.alloc(3 * 1024 * 1024, 42); await writeFile(file, bytes);
  const url = await createLocalAssetUrl(file, bytes.length);
  expect(url.length).toBeLessThan(100);
  expect(await createLocalAssetUrl(file, bytes.length)).toBe(url);
  const head = await handleLocalAssetRequest(new Request(url, { method: 'HEAD' }));
  expect(head.headers.get('content-length')).toBe(String(bytes.length)); expect(head.body).toBeNull();
  const response = await handleLocalAssetRequest(new Request(url));
  expect(response.headers.get('content-type')).toBe('font/ttf');
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  expect((await handleLocalAssetRequest(new Request('eisland-media://asset/guessed'))).status).toBe(403);
  expect((await handleLocalAssetRequest(new Request(url, { method: 'POST' }))).status).toBe(405);
  await expect(createLocalAssetUrl(file, 1024)).rejects.toThrow('size limit');
  await expect(createLocalAssetUrl(join(directory, 'file.exe'), 1024)).rejects.toThrow('Unsupported');
});
it('rechecks growth and evicts stale path grants after 256 distinct resources', async () => {
  const file = join(directory, 'first.png'); await writeFile(file, 'small');
  const url = await createLocalAssetUrl(file, 5);
  await writeFile(file, 'too large');
  expect((await handleLocalAssetRequest(new Request(url))).status).toBe(413);
  for (let index = 0; index < 256; index += 1) {
    const path = join(directory, index + '.png'); await writeFile(path, 'x'); await createLocalAssetUrl(path, 10);
  }
  expect((await handleLocalAssetRequest(new Request(url))).status).toBe(403);
});
