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
 * @file decryptBoundarySupplement.test.ts
 * @description CENC 标准容器、spade_a 协议授权、固定样本与损坏表长度的密码学行为测试。
 * @author 鸡哥
 */

import { createCipheriv } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptQishuiAudio } from '../decrypt';
const keyHex = '00112233445566778899aabbccddeeff';
const plain = Buffer.from('fixture samples');
/**
 * 构造标准 MP4 box，用于格式级输入。
 * @param type - 四字符 box 标识
 * @param buffers - box 载荷
 * @returns 标准长度头和载荷
 */
function box(type: string, ...buffers: Buffer[]): Buffer {
  const data = Buffer.concat(buffers); const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length + 8); header.write(type, 4, 'ascii');
  return Buffer.concat([header, data]);
}
interface ContainerOptions { fixed?: boolean; sizes?: Buffer; vectors?: Buffer; description?: Buffer; topLevel?: boolean; }
/**
 * 编码单样本 CENC 容器；替换表仅用于损坏输入测试。
 * @param options - 容器字段覆盖
 * @returns 使用真实 AES 加密的 MP4 文件
 */
function container(options: ContainerOptions = {}): Buffer {
  const sizes = Buffer.alloc(options.fixed ? 12 : 16);
  sizes.writeUInt32BE(options.fixed ? plain.length : 0, 4); sizes.writeUInt32BE(1, 8);
  if (!options.fixed) sizes.writeUInt32BE(plain.length, 12);
  const vectors = Buffer.alloc(16); vectors.writeUInt32BE(1, 4);
  const cipher = createCipheriv('aes-128-ctr', Buffer.from(keyHex, 'hex'), Buffer.alloc(16));
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const stbl = box('stbl', box('stsd', options.description ?? Buffer.from('enca')), box('stsz', options.sizes ?? sizes), ...(options.topLevel ? [] : [box('senc', options.vectors ?? vectors)]));
  const movie = box('moov', box('trak', box('mdia', box('minf', stbl))), ...(options.topLevel ? [box('senc', options.vectors ?? vectors)] : []));
  return Buffer.concat([movie, box('mdat', encrypted)]);
}
/**
 * 编码 spade_a 测试协议载荷，断言使用独立 AES 已知明文而非编码结果自对照。
 * @param marker - base36 跳过字符
 * @param skip - 尾部跳过字节数
 * @param padding - 编码尾部填充
 * @returns base64 加密播放授权
 */
function spade(marker: string, skip: number, padding = 0): string {
  const decoded = Buffer.from(marker + keyHex + 'x'.repeat(skip));
  const input = Buffer.alloc(decoded.length);
  decoded.forEach((value, index) => {
    const bits = index.toString(2).replaceAll('0', '').length;
    const initial = [0xfa, 0x55];
    const prior = initial[index] ?? input[index - 2];
    input[index] = (value + bits + 21) ^ prior;
  });
  const header = (48 + padding) ^ input[0] ^ input[1];
  return Buffer.concat([Buffer.from([header]), input, Buffer.alloc(padding)]).toString('base64');
}
describe('CENC 密钥编码与损坏容器边界', () => {
  it.each([['0', 0, 0], ['a', 10, 1]])('spade_a 跳过字符 %s 可解密真实 AES 样本', (marker, skip, padding) => {
    const encrypted = container({ fixed: true, topLevel: true });
    const result = decryptQishuiAudio(encrypted, spade(marker, skip, padding));
    expect(result.contentType).toBe('audio/mp4');
    expect(result.buffer.subarray(result.buffer.indexOf(Buffer.from('mdat')) + 4)).toEqual(plain);
    expect(encrypted.includes(Buffer.from('enca'))).toBe(true); expect(result.buffer.includes(Buffer.from('mp4a'))).toBe(true);
  });
  it.each([
    '!', Buffer.from([0, 0, 0]).toString('base64'), Buffer.from([200, 0, 0]).toString('base64'),
    Buffer.from([159, 250, 85]).toString('base64'), spade('A', 10),
  ])('损坏授权 %s 以稳定密钥错误拒绝', (auth) => {
    expect(() => decryptQishuiAudio(container(), auth)).toThrow('QISHUI_AUDIO_KEY_INVALID');
  });
  it('缺少必需 box 时拒绝容器', () => {
    expect(() => decryptQishuiAudio(Buffer.alloc(0), keyHex)).toThrow('QISHUI_AUDIO_CONTAINER_INVALID');
  });
  it.each(['sizes', 'vectors'] as const)('过短的 %s 表在读取字段前拒绝', (field) => {
    expect(() => decryptQishuiAudio(container({ [field]: Buffer.alloc(4) }), keyHex)).toThrow('QISHUI_AUDIO_CONTAINER_INVALID');
  });
  it('样本数和 IV 数不一致时拒绝', () => {
    const vectors = Buffer.alloc(16); vectors.writeUInt32BE(2, 4);
    expect(() => decryptQishuiAudio(container({ vectors }), keyHex)).toThrow('QISHUI_AUDIO_SAMPLE_COUNT_MISMATCH');
  });
  it('可变大小表不足以容纳计数时拒绝', () => {
    const sizes = Buffer.alloc(12); sizes.writeUInt32BE(1, 8);
    expect(() => decryptQishuiAudio(container({ sizes }), keyHex)).toThrow('QISHUI_AUDIO_CONTAINER_INVALID');
  });
  it('固定大小使用一个值解密，并保留非加密样本类型', () => {
    const result = decryptQishuiAudio(container({ fixed: true, description: Buffer.from('mp4a') }), keyHex);
    expect(result.buffer.subarray(result.buffer.indexOf(Buffer.from('mdat')) + 4)).toEqual(plain);
    expect(result.contentType).toBe('audio/mp4');
  });
  it('空 FLAC metadata 仍保留 MP4 容器', () => {
    const result = decryptQishuiAudio(container({ description: box('dfLa') }), keyHex);
    expect(result.contentType).toBe('audio/mp4');
    expect(result.buffer.subarray(result.buffer.indexOf(Buffer.from('mdat')) + 4)).toEqual(plain);
  });
});
