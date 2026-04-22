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
 * @file qrcDes.ts
 * @description QQ 音乐 QRC 专用的 TripleDES 位运算实现 — 逐行移植自
 *              lyricify-lyrics-provider-rs::parsers/decrypt/qrc.rs
 *              注意: SBOX2[23]=15、SBOX4[53]=10 为 QRC 非标准 S-box(Tencent 定制),
 *              不能使用 Node/WebCrypto 的标准 des-ede3 替代
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

/** QRC 固定 24 字节密钥 */
const QQ_KEY: Uint8Array = new Uint8Array([
  0x21, 0x40, 0x23, 0x29, 0x28, 0x2a, 0x24, 0x25, // !@#)(*$%
  0x31, 0x32, 0x33, 0x5a, 0x58, 0x43, 0x21, 0x40, // 123ZXC!@
  0x21, 0x40, 0x23, 0x29, 0x28, 0x4e, 0x48, 0x4c, // !@#)(NHL
]);

const ENCRYPT = 1;
const DECRYPT = 0;

/* eslint-disable @typescript-eslint/naming-convention */
const SBOX1 = [
  14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12,
  11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1,
  7, 5, 11, 3, 14, 10, 0, 6, 13,
];

const SBOX2 = [
  15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 15, 12, 0, 1,
  10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15,
  4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
];

const SBOX3 = [
  10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14,
  12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8,
  7, 4, 15, 14, 3, 11, 5, 2, 12,
];

const SBOX4 = [
  7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12,
  1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 10, 13,
  8, 9, 4, 5, 11, 12, 7, 2, 14,
];

const SBOX5 = [
  2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15,
  10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2,
  13, 6, 15, 0, 9, 10, 4, 5, 3,
];

const SBOX6 = [
  12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14,
  0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10,
  11, 14, 1, 7, 6, 0, 8, 13,
];

const SBOX7 = [
  4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12,
  2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7,
  9, 5, 0, 15, 14, 2, 3, 12,
];

const SBOX8 = [
  13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11,
  0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13,
  15, 12, 9, 0, 3, 5, 6, 11,
];
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * 从 8 字节输入中按 Rust `bitnum` 的规则取出第 b 位并置入目的位 c(u32)
 * @param a - 8 字节数组
 * @param b - 输入位索引(0..63),采用 QRC 的内部大端字序
 * @param c - 目标位在 u32 中的位置
 */
function bitnum(a: Uint8Array, b: number, c: number): number {
  const byteIdx = Math.floor(b / 32) * 4 + 3 - Math.floor((b % 32) / 8);
  return ((((a[byteIdx] >>> (7 - (b % 8))) & 0x01) << c) >>> 0);
}

/**
 * 从 u32 中取第 b 位(MSB=0),放入 u8 的第 c 位
 */
function bitnumIntr(a: number, b: number, c: number): number {
  return (((a >>> (31 - b)) & 1) << c) & 0xff;
}

/**
 * 将 a 左移 b 位后,取 bit31,再右移 c 位 — 对应 Rust `bitnum_intl`
 */
function bitnumIntl(a: number, b: number, c: number): number {
  return ((((a << b) >>> 0) & 0x80000000) >>> c) >>> 0;
}

/** 6 位 S-box 输入位重排: bits[5,4,3,2,1,0] → [5,0,4,3,2,1],还原标准 DES S-box 行列索引 */
function sboxBit(a: number): number {
  return ((a & 0x20) | ((a & 0x1f) >>> 1) | ((a & 0x01) << 4)) & 0x3f;
}

/** 16 轮轮密钥: schedule[round] 为 6 字节 */
type KeySchedule = Uint8Array[];

/** 生成 8 字节子密钥的 16 轮轮密钥表 */
function keySchedule(key: Uint8Array, mode: number): KeySchedule {
  const KEY_RND_SHIFT = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
  const KEY_PERM_C = [
    56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2,
    59, 51, 43, 35,
  ];
  const KEY_PERM_D = [
    62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12,
    4, 27, 19, 11, 3,
  ];
  const KEY_COMPRESSION = [
    13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40,
    51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31,
  ];

  const schedule: KeySchedule = Array.from({ length: 16 }, () => new Uint8Array(6));

  let c = 0;
  let d = 0;
  let j = 31;
  for (let i = 0; i < 28; i++) {
    c = (c | bitnum(key, KEY_PERM_C[i], j)) >>> 0;
    j--;
  }
  j = 31;
  for (let i = 0; i < 28; i++) {
    d = (d | bitnum(key, KEY_PERM_D[i], j)) >>> 0;
    j--;
  }

  for (let i = 0; i < 16; i++) {
    const shift = KEY_RND_SHIFT[i];
    c = (((c << shift) >>> 0) | (c >>> (28 - shift))) >>> 0;
    c = (c & 0xfffffff0) >>> 0;
    d = (((d << shift) >>> 0) | (d >>> (28 - shift))) >>> 0;
    d = (d & 0xfffffff0) >>> 0;

    const toGen = mode === DECRYPT ? 15 - i : i;
    const round = schedule[toGen];
    round.fill(0);

    for (let k = 0; k < 24; k++) {
      round[Math.floor(k / 8)] |= bitnumIntr(c, KEY_COMPRESSION[k], 7 - (k % 8));
    }
    for (let k = 24; k < 48; k++) {
      round[Math.floor(k / 8)] |= bitnumIntr(d, KEY_COMPRESSION[k] - 27, 7 - (k % 8));
    }
  }
  return schedule;
}

/** IP: 初始置换,8 字节 → 两个 u32 */
function ip(input: Uint8Array): [number, number] {
  const s0 = (
    bitnum(input, 57, 31) | bitnum(input, 49, 30) | bitnum(input, 41, 29) | bitnum(input, 33, 28)
    | bitnum(input, 25, 27) | bitnum(input, 17, 26) | bitnum(input, 9, 25) | bitnum(input, 1, 24)
    | bitnum(input, 59, 23) | bitnum(input, 51, 22) | bitnum(input, 43, 21) | bitnum(input, 35, 20)
    | bitnum(input, 27, 19) | bitnum(input, 19, 18) | bitnum(input, 11, 17) | bitnum(input, 3, 16)
    | bitnum(input, 61, 15) | bitnum(input, 53, 14) | bitnum(input, 45, 13) | bitnum(input, 37, 12)
    | bitnum(input, 29, 11) | bitnum(input, 21, 10) | bitnum(input, 13, 9) | bitnum(input, 5, 8)
    | bitnum(input, 63, 7) | bitnum(input, 55, 6) | bitnum(input, 47, 5) | bitnum(input, 39, 4)
    | bitnum(input, 31, 3) | bitnum(input, 23, 2) | bitnum(input, 15, 1) | bitnum(input, 7, 0)
  ) >>> 0;

  const s1 = (
    bitnum(input, 56, 31) | bitnum(input, 48, 30) | bitnum(input, 40, 29) | bitnum(input, 32, 28)
    | bitnum(input, 24, 27) | bitnum(input, 16, 26) | bitnum(input, 8, 25) | bitnum(input, 0, 24)
    | bitnum(input, 58, 23) | bitnum(input, 50, 22) | bitnum(input, 42, 21) | bitnum(input, 34, 20)
    | bitnum(input, 26, 19) | bitnum(input, 18, 18) | bitnum(input, 10, 17) | bitnum(input, 2, 16)
    | bitnum(input, 60, 15) | bitnum(input, 52, 14) | bitnum(input, 44, 13) | bitnum(input, 36, 12)
    | bitnum(input, 28, 11) | bitnum(input, 20, 10) | bitnum(input, 12, 9) | bitnum(input, 4, 8)
    | bitnum(input, 62, 7) | bitnum(input, 54, 6) | bitnum(input, 46, 5) | bitnum(input, 38, 4)
    | bitnum(input, 30, 3) | bitnum(input, 22, 2) | bitnum(input, 14, 1) | bitnum(input, 6, 0)
  ) >>> 0;

  return [s0, s1];
}

/** 逆 IP: 两个 u32 → 8 字节 */
function invIp(state: [number, number], output: Uint8Array): void {
  const s0 = state[0];
  const s1 = state[1];

  output[3] = bitnumIntr(s1, 7, 7) | bitnumIntr(s0, 7, 6) | bitnumIntr(s1, 15, 5) | bitnumIntr(s0, 15, 4)
    | bitnumIntr(s1, 23, 3) | bitnumIntr(s0, 23, 2) | bitnumIntr(s1, 31, 1) | bitnumIntr(s0, 31, 0);
  output[2] = bitnumIntr(s1, 6, 7) | bitnumIntr(s0, 6, 6) | bitnumIntr(s1, 14, 5) | bitnumIntr(s0, 14, 4)
    | bitnumIntr(s1, 22, 3) | bitnumIntr(s0, 22, 2) | bitnumIntr(s1, 30, 1) | bitnumIntr(s0, 30, 0);
  output[1] = bitnumIntr(s1, 5, 7) | bitnumIntr(s0, 5, 6) | bitnumIntr(s1, 13, 5) | bitnumIntr(s0, 13, 4)
    | bitnumIntr(s1, 21, 3) | bitnumIntr(s0, 21, 2) | bitnumIntr(s1, 29, 1) | bitnumIntr(s0, 29, 0);
  output[0] = bitnumIntr(s1, 4, 7) | bitnumIntr(s0, 4, 6) | bitnumIntr(s1, 12, 5) | bitnumIntr(s0, 12, 4)
    | bitnumIntr(s1, 20, 3) | bitnumIntr(s0, 20, 2) | bitnumIntr(s1, 28, 1) | bitnumIntr(s0, 28, 0);
  output[7] = bitnumIntr(s1, 3, 7) | bitnumIntr(s0, 3, 6) | bitnumIntr(s1, 11, 5) | bitnumIntr(s0, 11, 4)
    | bitnumIntr(s1, 19, 3) | bitnumIntr(s0, 19, 2) | bitnumIntr(s1, 27, 1) | bitnumIntr(s0, 27, 0);
  output[6] = bitnumIntr(s1, 2, 7) | bitnumIntr(s0, 2, 6) | bitnumIntr(s1, 10, 5) | bitnumIntr(s0, 10, 4)
    | bitnumIntr(s1, 18, 3) | bitnumIntr(s0, 18, 2) | bitnumIntr(s1, 26, 1) | bitnumIntr(s0, 26, 0);
  output[5] = bitnumIntr(s1, 1, 7) | bitnumIntr(s0, 1, 6) | bitnumIntr(s1, 9, 5) | bitnumIntr(s0, 9, 4)
    | bitnumIntr(s1, 17, 3) | bitnumIntr(s0, 17, 2) | bitnumIntr(s1, 25, 1) | bitnumIntr(s0, 25, 0);
  output[4] = bitnumIntr(s1, 0, 7) | bitnumIntr(s0, 0, 6) | bitnumIntr(s1, 8, 5) | bitnumIntr(s0, 8, 4)
    | bitnumIntr(s1, 16, 3) | bitnumIntr(s0, 16, 2) | bitnumIntr(s1, 24, 1) | bitnumIntr(s0, 24, 0);
}

/** 轮函数 f: 32 位 state + 48 位轮密钥 → 32 位 */
function f(state: number, key: Uint8Array): number {
  const lrgstate = new Uint8Array(6);

  const t1 = (
    bitnumIntl(state, 31, 0)
    | ((state & 0xf0000000) >>> 1)
    | bitnumIntl(state, 4, 5)
    | bitnumIntl(state, 3, 6)
    | ((state & 0x0f000000) >>> 3)
    | bitnumIntl(state, 8, 11)
    | bitnumIntl(state, 7, 12)
    | ((state & 0x00f00000) >>> 5)
    | bitnumIntl(state, 12, 17)
    | bitnumIntl(state, 11, 18)
    | ((state & 0x000f0000) >>> 7)
    | bitnumIntl(state, 16, 23)
  ) >>> 0;

  const t2 = (
    bitnumIntl(state, 15, 0)
    | (((state & 0x0000f000) << 15) >>> 0)
    | bitnumIntl(state, 20, 5)
    | bitnumIntl(state, 19, 6)
    | (((state & 0x00000f00) << 13) >>> 0)
    | bitnumIntl(state, 24, 11)
    | bitnumIntl(state, 23, 12)
    | (((state & 0x000000f0) << 11) >>> 0)
    | bitnumIntl(state, 28, 17)
    | bitnumIntl(state, 27, 18)
    | (((state & 0x0000000f) << 9) >>> 0)
    | bitnumIntl(state, 0, 23)
  ) >>> 0;

  lrgstate[0] = (t1 >>> 24) & 0xff;
  lrgstate[1] = (t1 >>> 16) & 0xff;
  lrgstate[2] = (t1 >>> 8) & 0xff;
  lrgstate[3] = (t2 >>> 24) & 0xff;
  lrgstate[4] = (t2 >>> 16) & 0xff;
  lrgstate[5] = (t2 >>> 8) & 0xff;

  for (let i = 0; i < 6; i++) lrgstate[i] ^= key[i];

  const sboxed = (
    ((SBOX1[sboxBit(lrgstate[0] >>> 2)] << 28) >>> 0)
    | ((SBOX2[sboxBit(((lrgstate[0] & 0x03) << 4) | (lrgstate[1] >>> 4))] << 24) >>> 0)
    | ((SBOX3[sboxBit(((lrgstate[1] & 0x0f) << 2) | (lrgstate[2] >>> 6))] << 20) >>> 0)
    | ((SBOX4[sboxBit(lrgstate[2] & 0x3f)] << 16) >>> 0)
    | ((SBOX5[sboxBit(lrgstate[3] >>> 2)] << 12) >>> 0)
    | ((SBOX6[sboxBit(((lrgstate[3] & 0x03) << 4) | (lrgstate[4] >>> 4))] << 8) >>> 0)
    | ((SBOX7[sboxBit(((lrgstate[4] & 0x0f) << 2) | (lrgstate[5] >>> 6))] << 4) >>> 0)
    | SBOX8[sboxBit(lrgstate[5] & 0x3f)]
  ) >>> 0;

  return (
    bitnumIntl(sboxed, 15, 0)
    | bitnumIntl(sboxed, 6, 1)
    | bitnumIntl(sboxed, 19, 2)
    | bitnumIntl(sboxed, 20, 3)
    | bitnumIntl(sboxed, 28, 4)
    | bitnumIntl(sboxed, 11, 5)
    | bitnumIntl(sboxed, 27, 6)
    | bitnumIntl(sboxed, 16, 7)
    | bitnumIntl(sboxed, 0, 8)
    | bitnumIntl(sboxed, 14, 9)
    | bitnumIntl(sboxed, 22, 10)
    | bitnumIntl(sboxed, 25, 11)
    | bitnumIntl(sboxed, 4, 12)
    | bitnumIntl(sboxed, 17, 13)
    | bitnumIntl(sboxed, 30, 14)
    | bitnumIntl(sboxed, 9, 15)
    | bitnumIntl(sboxed, 1, 16)
    | bitnumIntl(sboxed, 7, 17)
    | bitnumIntl(sboxed, 23, 18)
    | bitnumIntl(sboxed, 13, 19)
    | bitnumIntl(sboxed, 31, 20)
    | bitnumIntl(sboxed, 26, 21)
    | bitnumIntl(sboxed, 2, 22)
    | bitnumIntl(sboxed, 8, 23)
    | bitnumIntl(sboxed, 18, 24)
    | bitnumIntl(sboxed, 12, 25)
    | bitnumIntl(sboxed, 29, 26)
    | bitnumIntl(sboxed, 5, 27)
    | bitnumIntl(sboxed, 21, 28)
    | bitnumIntl(sboxed, 10, 29)
    | bitnumIntl(sboxed, 3, 30)
    | bitnumIntl(sboxed, 24, 31)
  ) >>> 0;
}

/** 单一 8 字节块的 DES 加/解密(由 schedule 内的轮密钥顺序决定方向) */
function cryptBlock(input: Uint8Array, output: Uint8Array, schedule: KeySchedule): void {
  const state = ip(input);

  for (let round = 0; round < 15; round++) {
    const tmp = state[1];
    state[1] = (f(state[1], schedule[round]) ^ state[0]) >>> 0;
    state[0] = tmp;
  }
  state[0] = (f(state[1], schedule[15]) ^ state[0]) >>> 0;

  invIp(state, output);
}

/** 3DES 三组子密钥装配(DECRYPT / ENCRYPT) */
function tripleDesKeySetup(key: Uint8Array, mode: number): [KeySchedule, KeySchedule, KeySchedule] {
  if (mode === ENCRYPT) {
    return [
      keySchedule(key.subarray(0, 8), mode),
      keySchedule(key.subarray(8, 16), DECRYPT),
      keySchedule(key.subarray(16, 24), mode),
    ];
  }
  // DECRYPT: 对外表现为 D_K1(E_K2(D_K3(C))) 的逆向序 (索引 [2,1,0])
  const s2 = keySchedule(key.subarray(0, 8), mode);
  const s1 = keySchedule(key.subarray(8, 16), ENCRYPT);
  const s0 = keySchedule(key.subarray(16, 24), mode);
  return [s0, s1, s2];
}

/** 按 Rust triple_des_crypt 顺序依次应用 schedule[0..2] */
function tripleDesCrypt(
  input: Uint8Array,
  output: Uint8Array,
  schedules: [KeySchedule, KeySchedule, KeySchedule],
): void {
  const tmp1 = new Uint8Array(8);
  const tmp2 = new Uint8Array(8);
  cryptBlock(input, tmp1, schedules[0]);
  cryptBlock(tmp1, tmp2, schedules[1]);
  cryptBlock(tmp2, output, schedules[2]);
}

/** 将 hex 字符串解码为字节数组(严格偶数长度) */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('QRC: hex string has odd length');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const v = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(v)) throw new Error(`QRC: invalid hex at offset ${i * 2}`);
    out[i] = v;
  }
  return out;
}

/**
 * QRC 3DES 解密(输出仍为压缩流,需后续 inflate)
 * @param hexCipher - 服务端返回的大写 hex 字符串(长度须为 8 字节对齐的 2 倍)
 * @returns 解密后的原始字节(通常是 zlib 数据)
 */
export function qrcTripleDesDecrypt(hexCipher: string): Uint8Array {
  const clean = hexCipher.replace(/\s+/g, '');
  const cipher = hexToBytes(clean);
  if (cipher.length % 8 !== 0) {
    throw new Error(`QRC: ciphertext length not aligned to 8-byte blocks: ${cipher.length}`);
  }

  const schedules = tripleDesKeySetup(QQ_KEY, DECRYPT);
  const out = new Uint8Array(cipher.length);
  const inBlock = new Uint8Array(8);
  const outBlock = new Uint8Array(8);
  for (let i = 0; i < cipher.length; i += 8) {
    inBlock.set(cipher.subarray(i, i + 8));
    tripleDesCrypt(inBlock, outBlock, schedules);
    out.set(outBlock, i);
  }
  return out;
}
