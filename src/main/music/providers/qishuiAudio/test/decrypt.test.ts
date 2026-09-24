/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file decrypt.test.ts
 * @description 验证汽水样本解密输出及损坏 MP4 计数字段的内存保护。
 * @author 鸡哥
 */

import { createCipheriv } from 'crypto';
import { describe, expect, it } from 'vitest';
import { decryptQishuiAudio } from '../decrypt';

const KEY = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
const SAMPLES = [Buffer.from('first frame'), Buffer.alloc(131_099, 0x6d), Buffer.from('last frame')];

function box(type: string, ...parts: Buffer[]): Buffer {
  const data = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length + 8);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, data]);
}

function container(flacMetadata?: Buffer): Buffer {
  const sizes = Buffer.alloc(12 + SAMPLES.length * 4);
  sizes.writeUInt32BE(SAMPLES.length, 8);
  const vectors = Buffer.alloc(8 + SAMPLES.length * 8);
  vectors.writeUInt32BE(SAMPLES.length, 4);
  const encrypted = SAMPLES.map((sample, index) => {
    sizes.writeUInt32BE(sample.length, 12 + index * 4);
    const iv = Buffer.alloc(16);
    iv.writeUInt32BE(index + 1);
    iv.copy(vectors, 8 + index * 8, 0, 8);
    const cipher = createCipheriv('aes-128-ctr', KEY, iv);
    return Buffer.concat([cipher.update(sample), cipher.final()]);
  });
  const stsd = box('stsd', flacMetadata ? box('dfLa', flacMetadata) : Buffer.from('enca'));
  const stbl = box('stbl', stsd, box('stsz', sizes), box('senc', vectors));
  return Buffer.concat([box('moov', box('trak', box('mdia', box('minf', stbl)))), box('mdat', ...encrypted)]);
}

describe('decryptQishuiAudio', () => {
  it('decrypts AAC samples across chunk boundaries and preserves the input container', () => {
    const encrypted = container();
    const original = Buffer.from(encrypted);
    const audio = decryptQishuiAudio(encrypted, KEY.toString('hex'));
    const dataOffset = audio.buffer.indexOf(Buffer.from('mdat')) + 4;

    expect(audio.contentType).toBe('audio/mp4');
    expect(audio.buffer.subarray(dataOffset)).toEqual(Buffer.concat(SAMPLES));
    expect(audio.buffer.includes(Buffer.from('mp4a'))).toBe(true);
    expect(encrypted).toEqual(original);
  });

  it('writes FLAC metadata and samples into the final output', () => {
    const metadata = Buffer.from([0x80, 0, 0, 2, 0x12, 0x34]);
    const audio = decryptQishuiAudio(container(metadata), KEY.toString('hex'));

    expect(audio.contentType).toBe('audio/flac');
    expect(audio.buffer).toEqual(Buffer.concat([Buffer.from('fLaC'), metadata, ...SAMPLES]));
  });

  it('rejects huge sample and IV counts before allocating arrays', () => {
    const encrypted = container();
    const sizesOffset = encrypted.indexOf(Buffer.from('stsz')) + 4;
    const vectorsOffset = encrypted.indexOf(Buffer.from('senc')) + 4;
    encrypted.writeUInt32BE(1, sizesOffset + 4);
    encrypted.writeUInt32BE(0xffffffff, sizesOffset + 8);
    encrypted.writeUInt32BE(0xffffffff, vectorsOffset + 4);

    expect(() => decryptQishuiAudio(encrypted, KEY.toString('hex'))).toThrow('QISHUI_AUDIO_CONTAINER_INVALID');
  });

  it('rejects samples extending beyond mdat before decrypting them', () => {
    const encrypted = container();
    const sizesOffset = encrypted.indexOf(Buffer.from('stsz')) + 4;
    encrypted.writeUInt32BE(encrypted.length, sizesOffset + 12);

    expect(() => decryptQishuiAudio(encrypted, KEY.toString('hex'))).toThrow('QISHUI_AUDIO_CONTAINER_INVALID');
  });
});
