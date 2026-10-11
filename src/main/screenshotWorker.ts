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
 * @file screenshotWorker.ts
 * @description 一次性原生截图子进程，stdout 只传 PNG/窗口 JSON 原始字节。
 * @author 鸡哥
 */
import { encodeScreenshotBitmap } from './window/screenshotEncoding';
import { captureAllDisplaysPng, capturePrimaryDisplayPng, getVisibleWindows } from './window/screenshotNative';

/** 执行一次任务，响应完毕即退出以释放 native 位图和编码缓冲。 */
async function run(): Promise<void> {
  try {
    const operation = process.argv[2];
    let data: Buffer | null;
    if (operation === 'encode') {
      const width = Number(process.argv[3]);
      const height = Number(process.argv[4]);
      const length = width * height * 4;
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0
        || length > 128 * 1024 * 1024) throw new Error('Invalid bitmap size');
      const bitmap = Buffer.allocUnsafe(length);
      let offset = 0;
      for await (const part of process.stdin) {
        const bytes = part as Buffer;
        if (offset + bytes.length > length) throw new Error('Bitmap input exceeds expected size');
        bytes.copy(bitmap, offset); offset += bytes.length;
      }
      if (offset !== length) throw new Error('Incomplete bitmap input');
      data = encodeScreenshotBitmap(bitmap, width, height);
    } else {
      data = operation === 'windows' ? Buffer.from(JSON.stringify(getVisibleWindows()))
        : operation === 'primary' ? capturePrimaryDisplayPng()
          : operation === 'all' ? captureAllDisplaysPng() : null;
    }
    if (!data) process.exit(1);
    else process.stdout.end(data, () => process.exit(0));
  } catch { process.exit(1); }
}
void run();
