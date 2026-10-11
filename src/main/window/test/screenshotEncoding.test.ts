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
 * @file screenshotEncoding.test.ts
 * @description 原始 BGRA 到 PNG 的颜色、透明度、尺寸、CRC 和边界验证。
 * @author 鸡哥
 */
import { crc32, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodeScreenshotBitmap } from '../screenshotEncoding';

describe('截图 PNG 编码', () => {
  it('PNG 包含正确尺寸、有效 chunk CRC，预乘 BGRA 被还原成 RGBA', () => {
    const png = encodeScreenshotBitmap(Buffer.from([0, 0, 255, 255, 0, 64, 0, 128, 99, 88, 77, 0]), 3, 1);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(3);
    expect(png.readUInt32BE(20)).toBe(1);
    let decoded = Buffer.alloc(0);
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      const content = png.subarray(offset + 4, offset + 8 + length);
      expect(png.readUInt32BE(offset + 8 + length)).toBe(crc32(content));
      if (content.subarray(0, 4).toString() === 'IDAT') decoded = inflateSync(content.subarray(4));
      offset += length + 12;
    }
    expect(decoded).toEqual(Buffer.from([0, 255, 0, 0, 255, 0, 128, 0, 128, 0, 0, 0, 0]));
  });
  it.each([[0, 1], [1.5, 1], [1, -1], [8192, 8192], [1, 2]])('无效或过大尺寸 %s × %s 在分配前拒绝', (width, height) => {
    expect(() => encodeScreenshotBitmap(Buffer.alloc(4), width, height)).toThrow('Invalid screenshot bitmap dimensions');
  });
});
