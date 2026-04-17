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
 * @file krc.ts
 * @description 酷狗 KRC 逐字歌词解密流程 — base64 → 跳过 4 字节头 → 循环 XOR → inflate → 跳过 BOM/首字节 → UTF-8
 *              对齐 lyricify-lyrics-provider-rs::parsers/decrypt/krc.rs::krc_decrypt
 * @author 鸡哥
 */

import { inflateAuto } from './inflate';

/** 酷狗 KRC 固定 16 字节 XOR 密钥 */
const KRC_XOR_KEY = new Uint8Array([
  0x40, 0x47, 0x61, 0x77, 0x5e, 0x32, 0x74, 0x47,
  0x51, 0x36, 0x31, 0x2d, 0xce, 0xd2, 0x6e, 0x69,
]);

/** base64 → Uint8Array */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * 将酷狗 KRC 密文解密为明文逐字歌词
 * @param b64Cipher - 下载接口 `content` 字段返回的 base64 字符串
 * @returns 解密并去除 BOM/首字节后的 UTF-8 逐字歌词
 * @throws 长度不合法 / inflate 失败 / UTF-8 解码失败 时抛错
 */
export async function decryptKRC(b64Cipher: string): Promise<string> {
  const clean = b64Cipher.replace(/\s+/g, '');
  const decoded = base64ToBytes(clean);
  if (decoded.length <= 4) {
    throw new Error(`KRC: decoded too short: ${decoded.length} bytes`);
  }

  const body = new Uint8Array(decoded.length - 4);
  for (let i = 0; i < body.length; i++) {
    body[i] = decoded[i + 4] ^ KRC_XOR_KEY[i % KRC_XOR_KEY.length];
  }

  const inflated = await inflateAuto(body);
  const bomLen = inflated[0] === 0xef && inflated[1] === 0xbb && inflated[2] === 0xbf ? 3 : 1;
  if (inflated.length <= bomLen) {
    throw new Error(`KRC: inflated too short after skip(${bomLen}): ${inflated.length}`);
  }
  return new TextDecoder('utf-8').decode(inflated.subarray(bomLen));
}
