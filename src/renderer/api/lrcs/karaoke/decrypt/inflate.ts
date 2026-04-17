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
 * @file inflate.ts
 * @description zlib / raw deflate 解压封装 — 基于浏览器原生 `DecompressionStream`，无第三方依赖
 *              对齐 lyricify-lyrics-provider-rs::parsers/decrypt/qrc.rs::inflate_bytes 行为
 *              (优先 zlib header,失败回退 raw deflate)
 * @author 鸡哥
 */

async function decompress(data: Uint8Array, format: 'deflate' | 'deflate-raw'): Promise<Uint8Array> {
  // 拷贝一份独立的 ArrayBuffer,规避 TS 对 `Uint8Array<SharedArrayBuffer>` 的严格推断
  const owned = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([owned]).stream().pipeThrough(new DecompressionStream(format));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 尝试 zlib 解压，失败时回退到 raw deflate
 * @param data - 待解压字节（可能是 zlib 流或裸 deflate 流）
 * @returns 解压后的字节数组
 * @throws 两种格式均失败时抛错
 */
export async function inflateAuto(data: Uint8Array): Promise<Uint8Array> {
  try {
    const out = await decompress(data, 'deflate');
    if (out.byteLength > 0) return out;
  } catch { /* fallthrough to raw deflate */ }

  try {
    const out = await decompress(data, 'deflate-raw');
    if (out.byteLength > 0) return out;
    throw new Error('Inflate: raw deflate produced empty output');
  } catch (err) {
    throw new Error(`Inflate: both zlib and raw deflate failed (${(err as Error).message})`);
  }
}
