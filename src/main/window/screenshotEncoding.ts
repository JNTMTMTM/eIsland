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
 * @file screenshotEncoding.ts
 * @description 子进程内将 Chromium N32 premultiplied BGRA 位图编码为 PNG。
 * @author 鸡哥
 */
import { crc32, deflateSync } from 'node:zlib';

/**
 * 编码 Windows little-endian N32 截图，包含像素、长度和输出上限。
 * @param bitmap - nativeImage.toBitmap() 取得的预乘 BGRA 字节
 * @param width - 像素宽度
 * @param height - 像素高度
 * @returns PNG 字节
 */
export function encodeScreenshotBitmap(bitmap: Buffer, width: number, height: number): Buffer {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0
    || width * height > 32 * 1024 * 1024 || bitmap.length !== width * height * 4) {
    throw new Error('Invalid screenshot bitmap dimensions');
  }
  const stride = width * 4 + 1;
  const scanlines = Buffer.allocUnsafe(stride * height);
  for (let row = 0; row < height; row += 1) {
    const base = row * stride;
    scanlines[base] = 0;
    for (let col = 0; col < width; col += 1) {
      const source = (row * width + col) * 4;
      const target = base + 1 + col * 4;
      const alpha = bitmap[source + 3];
      // PNG 使用非预乘 RGBA；透明像素避免除零。
      scanlines[target] = alpha ? Math.min(255, Math.round(bitmap[source + 2] * 255 / alpha)) : 0;
      scanlines[target + 1] = alpha ? Math.min(255, Math.round(bitmap[source + 1] * 255 / alpha)) : 0;
      scanlines[target + 2] = alpha ? Math.min(255, Math.round(bitmap[source] * 255 / alpha)) : 0;
      scanlines[target + 3] = alpha;
    }
  }
  const chunk = (name: string, data: Buffer): Buffer => {
    const result = Buffer.allocUnsafe(data.length + 12);
    result.writeUInt32BE(data.length);
    result.write(name, 4, 4, 'ascii');
    data.copy(result, 8);
    result.writeUInt32BE(crc32(result.subarray(4, 8 + data.length)), 8 + data.length);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const compressed = deflateSync(scanlines, { level: 3 });
  if (compressed.length > 64 * 1024 * 1024 - 57) throw new Error('PNG exceeds 64 MiB');
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}
