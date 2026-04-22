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
 * @file qrc.ts
 * @description QQ 音乐 QRC 逐字歌词解密流程 — hex → TripleDES → zlib/inflate → UTF-8
 *              对齐 lyricify-lyrics-provider-rs::parsers/decrypt/qrc.rs::qrc_decrypt
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { qrcTripleDesDecrypt } from './qrcDes';
import { inflateAuto } from './inflate';

/**
 * 将 QQ 音乐接口返回的 QRC 密文解密为明文逐字歌词
 *
 * 注意: QQ 接口对「无 QRC 可用」的歌曲,会返回占位密文(长度通常很短 ≤ 128 字节);
 * 该占位解密后并非 zlib/deflate 数据,此处 `inflateAuto` 会抛错 —— 调用方应将
 * 错误视作"此曲无逐字歌词",而非真正的故障。
 *
 * @param hexCipher - XML `CDATA[...]` 中的大写 hex 字符串
 * @returns 解密后的 UTF-8 逐字歌词文本
 * @throws 密文长度非法 / 3DES 失败 / inflate 失败(通常=无 QRC) 时抛出
 */
export async function decryptQRC(hexCipher: string): Promise<string> {
  const decrypted = qrcTripleDesDecrypt(hexCipher);
  try {
    const inflated = await inflateAuto(decrypted);
    return new TextDecoder('utf-8').decode(inflated);
  } catch (err) {
    const cipherLen = hexCipher.length / 2;
    const head = Array.from(decrypted.subarray(0, Math.min(8, decrypted.length)))
      .map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const hint = cipherLen <= 128
      ? '可能是此曲无 QRC(服务端占位密文)'
      : '更可能是解压兼容差异或密文不匹配';
    throw new Error(
      `QRC inflate 失败(${hint}); ciphertext 长度=${cipherLen}B, 解密头8字节=[${head}]: ${(err as Error).message}`,
    );
  }
}
