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
 * @file spotifyTotp.ts
 * @description Spotify TOTP 认证工具 — 移植自 Lyrix parsers/generate/spotify.rs
 *              实现 SHA1 / HMAC-SHA1 / HOTP / TOTP，用于 Spotify web player token 获取
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

/* ── SHA-1 ─────────────────────────────────────────────────────────── */

function sha1Compress(state: Uint32Array, block: Uint8Array): void {
  const w = new Uint32Array(80);
  for (let i = 0; i < 16; i++) {
    w[i] = (block[i * 4] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3];
  }
  for (let i = 16; i < 80; i++) {
    w[i] = ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) << 1) | ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) >>> 31);
  }

  let [a, b, c, d, e] = state;
  for (let i = 0; i < 80; i++) {
    let f: number, k: number;
    if (i < 20) {
      f = (b & c) | (~b & d);
      k = 0x5a827999;
    } else if (i < 40) {
      f = b ^ c ^ d;
      k = 0x6ed9eba1;
    } else if (i < 60) {
      f = (b & c) | (b & d) | (c & d);
      k = 0x8f1bbcdc;
    } else {
      f = b ^ c ^ d;
      k = 0xca62c1d6;
    }
    const temp = ((a << 5) | (a >>> 27)) + f + e + k + w[i];
    e = d;
    d = c;
    c = ((b << 30) | (b >>> 2));
    b = a;
    a = temp >>> 0;
  }
  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0;
}

function sha1(data: Uint8Array): Uint8Array {
  const state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const buffer = new Uint8Array(64);
  let bufLen = 0;
  let totalLen = 0;

  function update(chunk: Uint8Array): void {
    let off = 0;
    totalLen += chunk.length;

    if (bufLen > 0) {
      const take = Math.min(64 - bufLen, chunk.length);
      buffer.set(chunk.subarray(0, take), bufLen);
      bufLen += take;
      off += take;
      if (bufLen === 64) {
        sha1Compress(state, buffer);
        bufLen = 0;
      }
    }
    while (off + 64 <= chunk.length) {
      sha1Compress(state, chunk.subarray(off, off + 64));
      off += 64;
    }
    if (off < chunk.length) {
      buffer.set(chunk.subarray(off), 0);
      bufLen = chunk.length - off;
    }
  }

  update(data);

  // padding
  buffer[bufLen++] = 0x80;
  if (bufLen > 56) {
    buffer.fill(0, bufLen);
    sha1Compress(state, buffer);
    bufLen = 0;
  }
  buffer.fill(0, bufLen);
  const bitLen = totalLen * 8;
  // 写入 64-bit 大端长度（高 32 位实际为 0，因 JS 安全整数限制）
  const view = new DataView(buffer.buffer, 56, 8);
  view.setUint32(0, Math.floor(bitLen / 0x100000000));
  view.setUint32(4, bitLen >>> 0);
  sha1Compress(state, buffer);

  const out = new Uint8Array(20);
  for (let i = 0; i < 5; i++) {
    out[i * 4] = (state[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (state[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (state[i] >>> 8) & 0xff;
    out[i * 4 + 3] = state[i] & 0xff;
  }
  return out;
}

/* ── HMAC-SHA-1 ────────────────────────────────────────────────────── */

function hmacSha1(key: Uint8Array, data: Uint8Array): Uint8Array {
  // RFC 2104：超过分组长度的密钥先取摘要，不能直接截断。
  const normalizedKey = key.length > 64 ? sha1(key) : key;
  const k = new Uint8Array(64);
  k.set(normalizedKey);

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = k[i] ^ 0x36;
    opad[i] = k[i] ^ 0x5c;
  }

  const inner = sha1(concat(ipad, data));
  return sha1(concat(opad, inner));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/* ── HOTP / TOTP ───────────────────────────────────────────────────── */

function counterToBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  // counter 是 u64，JS number 安全到 2^53，足够用
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  return buf;
}

function hotp(secret: Uint8Array, counter: number, digits: number): string {
  const hmac = hmacSha1(secret, counterToBytes(counter));
  const offset = hmac[19] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

export interface TotpConfig {
  secret: Uint8Array;
  period: number;   // seconds
  digits: number;
  version: number;
}

function totpGenerate(config: TotpConfig, timestampMs: number): string {
  const counter = Math.floor(timestampMs / 1000 / config.period);
  return hotp(config.secret, counter, config.digits);
}

/**
 * 使用当前时间生成 TOTP 验证码
 * @param config - TOTP 配置参数
 * @returns 当前时间对应的 TOTP 验证码字符串
 */
export function totpGenerateNow(config: TotpConfig): string {
  return totpGenerate(config, Date.now());
}

/* ── Hardcoded TOTP secrets (from Lyrix build_totp) ────────────────── */

const TOTP_CONFIGS: TotpConfig[] = [
  {
    // version 61, 60 bytes
    secret: new Uint8Array([
      51, 55, 54, 49, 51, 54, 51, 56, 55, 53, 51, 56, 52, 53, 57, 56, 57, 51, 56, 56, 51,
      51, 49, 50, 51, 49, 48, 57, 49, 49, 57, 57, 50, 56, 52, 55, 49, 49, 50, 52, 52, 56,
      56, 57, 52, 52, 49, 48, 50, 49, 48, 53, 49, 49, 50, 57, 55, 49, 48, 56,
    ]),
    period: 30,
    digits: 6,
    version: 61,
  },
  {
    // version 60, 46 bytes
    secret: new Uint8Array([
      55, 48, 49, 48, 51, 55, 56, 49, 49, 57, 56, 55, 55, 57, 51, 51, 57, 48, 55, 57, 52,
      56, 52, 49, 51, 54, 56, 51, 56, 49, 55, 53, 55, 55, 57, 57, 51, 55, 54, 52, 57, 50,
      55, 52, 55, 51,
    ]),
    period: 30,
    digits: 6,
    version: 60,
  },
  {
    // version 59, 70 bytes
    secret: new Uint8Array([
      49, 49, 52, 57, 57, 54, 56, 55, 52, 57, 57, 53, 51, 53, 57, 49, 48, 57, 52, 53, 51,
      53, 54, 55, 56, 50, 55, 54, 57, 51, 55, 49, 55, 56, 51, 56, 52, 55, 57, 54, 53, 55,
      49, 48, 52, 52, 55, 52, 51, 49, 50, 53, 49, 48, 56, 50, 56, 49, 50, 49, 49, 52, 50,
      49, 55, 56, 57, 57, 57, 54,
    ]),
    period: 30,
    digits: 6,
    version: 59,
  },
];

/**
 * 根据索引获取预置的 TOTP 配置
 * @param index - TOTP 配置索引（0=v61, 1=v60, 2=v59）
 * @returns 对应版本的 TOTP 配置
 * @throws 索引超出范围时抛出错误
 */
export function buildTotp(index: number): TotpConfig {
  const config = TOTP_CONFIGS[index];
  if (!config) throw new Error(`Invalid TOTP index: ${index}`);
  return config;
}
