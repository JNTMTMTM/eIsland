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
 * @file downloadWallpaper.ts
 * @description 有截止时间和实际字节上限的流式壁纸下载。
 * @author 鸡哥
 */

import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { net } from 'electron';

/**
 * 流式保存网络图片，失败、超限或取消时删除临时文件。
 * @param url - 网络来源。
 * @param destination - 从响应头计算最终文件路径。
 * @param maxBytes - 实际接收字节上限。
 * @returns 已完成文件路径。
 */
export default async function downloadWallpaper(url: string, destination: (response: Response) => string, maxBytes: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let temporary: string | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await net.fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxBytes) throw new Error('Wallpaper response unavailable or too large');
    const target = destination(response);
    await mkdir(dirname(target), { recursive: true });
    temporary = target + '.' + randomUUID() + '.part';
    const file = await open(temporary, 'wx');
    let received = 0;
    reader = response.body.getReader();
    try {
      while (true) {
        controller.signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) throw new Error('Wallpaper exceeds size limit');
        let offset = 0;
        while (offset < value.byteLength) {
          const { bytesWritten } = await file.write(value, offset, value.byteLength - offset);
          if (bytesWritten <= 0) throw new Error('Wallpaper write failed');
          offset += bytesWritten;
        }
      }
      if (!received) throw new Error('Empty wallpaper');
    } finally { await file.close(); }
    await rename(temporary, target);
    temporary = undefined;
    return target;
  } finally {
    clearTimeout(timer);
    controller.abort();
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
    if (temporary) await unlink(temporary).catch(() => {});
  }
}
