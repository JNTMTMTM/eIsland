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
 * @file index.ts
 * @description 基于 Base32 种子生成 TOTP 的工具实现。
 * @author 鸡哥
 */

import {
  BASE32_ALPHABET,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_HMAC_HASH,
  DEFAULT_TOTP_PERIOD_SECONDS,
} from '../data';

function decodeBase32(seed: string): ArrayBuffer {
  const normalized = seed.trim().toUpperCase().replace(/=/g, '');
  if (!normalized) {
    throw new Error('TOTP Seed 为空');
  }

  let value = 0;
  let bits = 0;
  const out: number[] = [];
  normalized.split('').forEach((ch) => {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) {
      throw new Error('TOTP Seed 格式错误');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  });

  const bytes = Uint8Array.from(out);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/**
 * 使用 Base32 种子按 RFC 6238 规则生成一次性 TOTP。
 * @param seed - Base32 编码密钥。
 * @param timestampSeconds - 当前 Unix 时间戳（秒）。
 * @param periodSeconds - TOTP 时间步长（秒）。
 * @param digits - OTP 位数。
 * @returns 指定位数的 TOTP 字符串。
 */
export async function generateTotpFromBase32Seed(
  seed: string,
  timestampSeconds: number,
  periodSeconds: number = DEFAULT_TOTP_PERIOD_SECONDS,
  digits: number = DEFAULT_TOTP_DIGITS,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto 不可用');
  }

  const counter = Math.floor(timestampSeconds / periodSeconds);
  const counterBytes = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeBase32(seed),
    { name: 'HMAC', hash: DEFAULT_TOTP_HMAC_HASH },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, counterBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24)
    | ((hash[offset + 1] & 0xff) << 16)
    | ((hash[offset + 2] & 0xff) << 8)
    | (hash[offset + 3] & 0xff);
  const otp = binary % (10 ** digits);
  return String(otp).padStart(digits, '0');
}
