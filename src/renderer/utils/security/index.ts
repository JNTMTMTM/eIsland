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
 * @description 安全工具统一导出（重放防护头与 TOTP 相关能力）。
 * @author 鸡哥
 */

export { generateTotpFromBase32Seed } from './totp';
export {
  BASE32_ALPHABET,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_HMAC_HASH,
  DEFAULT_TOTP_PERIOD_SECONDS,
} from './data';

/**
 * 生成请求防重放 nonce。
 * @returns 十六进制随机串。
 */
export function createReplayNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 构造防重放请求头。
 * @param timestampHeaderName - 时间戳头字段名。
 * @param nonceHeaderName - 随机串头字段名。
 * @param timestampMs - 时间戳（毫秒），默认当前时间。
 * @returns 防重放请求头对象。
 */
export function buildReplayHeaders(
  timestampHeaderName: string,
  nonceHeaderName: string,
  timestampMs: number = Date.now(),
): Record<string, string> {
  return {
    [timestampHeaderName]: String(timestampMs),
    [nonceHeaderName]: createReplayNonce(),
  };
}
