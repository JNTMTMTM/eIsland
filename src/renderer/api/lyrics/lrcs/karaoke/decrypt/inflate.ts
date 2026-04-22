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
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

async function decompress(data: Uint8Array, format: 'deflate' | 'deflate-raw'): Promise<Uint8Array> {
  // 拷贝一份独立的 ArrayBuffer,规避 TS 对 `Uint8Array<SharedArrayBuffer>` 的严格推断
  const owned = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([owned]).stream().pipeThrough(new DecompressionStream(format));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

const MAX_TAIL_TRIM_BYTES = 16;

/**
 * 兼容性解压: 先按原长度尝试,失败时容忍少量尾部垃圾字节并逐字节裁剪重试。
 *
 * Rust `flate2` 在部分场景可容忍流尾残留字节; 浏览器 `DecompressionStream`
 * 更严格,会直接抛错("Failed to fetch")。这里通过小范围 tail-trim 行为贴近 Rust。
 */
async function decompressWithTailTrim(
  data: Uint8Array,
  format: 'deflate' | 'deflate-raw',
): Promise<Uint8Array> {
  let lastErr: unknown = null;

  const maxTrim = Math.min(MAX_TAIL_TRIM_BYTES, Math.max(0, data.length - 1));
  for (let trim = 0; trim <= maxTrim; trim += 1) {
    const payload = trim === 0 ? data : data.subarray(0, data.length - trim);
    try {
      const out = await decompress(payload, format);
      if (out.byteLength > 0) return out;
      lastErr = new Error(`Inflate: ${format} produced empty output (trim=${trim})`);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error(`Inflate: ${format} failed`);
}

/**
 * 尝试 zlib 解压，失败时回退到 raw deflate
 * @param data - 待解压字节（可能是 zlib 流或裸 deflate 流）
 * @returns 解压后的字节数组
 * @throws 两种格式均失败时抛错
 */
export async function inflateAuto(data: Uint8Array): Promise<Uint8Array> {
  try {
    return await decompressWithTailTrim(data, 'deflate');
  } catch { /* fallthrough to raw deflate */ }

  try {
    return await decompressWithTailTrim(data, 'deflate-raw');
  } catch (err) {
    throw new Error(`Inflate: both zlib and raw deflate failed (${(err as Error).message})`);
  }
}
