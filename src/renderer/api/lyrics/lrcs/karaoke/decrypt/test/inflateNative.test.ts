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
 * @file inflateNative.test.ts
 * @description 原生 zlib 与 raw deflate 压缩流的 UTF-8、尾部裁剪、空输出和损坏数据测试。
 * @author 鸡哥
 */

import { deflateRawSync, deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { inflateAuto } from '../inflate';

describe('real native decompression contracts', () => {
  it.each([{ label: 'zlib', compress: deflateSync }, { label: 'raw', compress: deflateRawSync }])('decodes UTF-8 from independent  $label compression', async ({ compress }) => {
    const text = '你好 Hello';
    expect(new TextDecoder().decode(await inflateAuto(compress(text)))).toBe(text);
  });
  it.each([{ label: 'zlib', compress: deflateSync }, { label: 'raw', compress: deflateRawSync }])('rejects valid  $label streams producing empty output', async ({ compress }) => {
    await expect(inflateAuto(compress(''))).rejects.toThrow('both zlib and raw deflate failed');
  });
  it.each([0, 4, 16])('accepts at most %s trailing garbage bytes', async (length) => {
    const data = Buffer.concat([deflateSync('Hello'), Buffer.alloc(length, 0xff)]);
    expect(new TextDecoder().decode(await inflateAuto(data))).toBe('Hello');
  });
  it('uses only the supplied slice instead of surrounding backing buffer data', async () => {
    const compressed = deflateSync('Slice');
    const backing = Buffer.concat([Buffer.from('before'), compressed, Buffer.from('after')]);
    expect(new TextDecoder().decode(await inflateAuto(backing.subarray(6, 6 + compressed.length)))).toBe('Slice');
  });
  it('rejects garbage beyond the 16-byte compatibility limit', async () => {
    await expect(inflateAuto(Buffer.concat([deflateSync('Hello'), Buffer.alloc(17, 0xff)]))).rejects.toThrow('both zlib and raw deflate failed');
  });
  it('rejects a truncated independent stream', async () => {
    const compressed = deflateSync('Hello');
    await expect(inflateAuto(compressed.subarray(0, 3))).rejects.toThrow('both zlib and raw deflate failed');
  });
});
