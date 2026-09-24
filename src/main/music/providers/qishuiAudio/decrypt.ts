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
 * @file decrypt.ts
 * @description 汽水音乐 play_auth 密钥解析与 CENC 音频样本解密。
 * @author 鸡哥
 */

import { createDecipheriv } from 'crypto';
import { findMp4Box } from './mp4';

function bitCount(value: number): number {
  let current = value;
  current -= (current >> 1) & 0x55555555;
  current = (current & 0x33333333) + ((current >> 2) & 0x33333333);
  return (((current + (current >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

function decodeBase36(charCode: number): number {
  if (charCode >= 48 && charCode <= 57) return charCode - 48;
  if (charCode >= 97 && charCode <= 122) return charCode - 97 + 10;
  return 0xff;
}

function decryptSpadeA(spadeA: string): string {
  const source = Buffer.from(spadeA, 'base64');
  if (source.length < 3) return '';
  const paddingLength = (source[0] ^ source[1] ^ source[2]) - 48;
  if (paddingLength < 0 || source.length < paddingLength + 2) return '';
  const input = source.subarray(1, source.length - paddingLength);
  const working = Buffer.alloc(input.length + 2);
  working[0] = 0xfa;
  working[1] = 0x55;
  input.copy(working, 2);
  const decoded = Buffer.from(input);
  for (let index = 0; index < decoded.length; index += 1) {
    let value = (input[index] ^ working[index]) - bitCount(index) - 21;
    while (value < 0) value += 0xff;
    decoded[index] = value & 0xff;
  }
  const skipBytes = decodeBase36(decoded[0]);
  const end = 1 + source.length - paddingLength - 2 - skipBytes;
  return end <= decoded.length ? decoded.subarray(1, end).toString('utf8') : '';
}

function findFlacMetadata(stsdData: Buffer): Buffer {
  const markerIndex = stsdData.indexOf(Buffer.from('dfLa'));
  if (markerIndex < 4) return Buffer.alloc(0);
  const boxSize = stsdData.readUInt32BE(markerIndex - 4);
  return stsdData.subarray(markerIndex + 4, Math.min(markerIndex - 4 + boxSize, stsdData.length));
}

function replaceEncryptedAudioType(buffer: Buffer, start: number, end: number): void {
  const index = buffer.indexOf(Buffer.from('enca'), start);
  if (index >= start && index + 4 <= end) Buffer.from('mp4a').copy(buffer, index);
}

/**
 * 使用汽水 play_auth 解密完整音频文件。
 * @param encryptedBuffer - 上游返回的 CENC MP4 音频
 * @param playAuth - 十六进制密钥或汽水 spade_a
 * @returns 解密后的音频数据和 MIME 类型
 */
export function decryptQishuiAudio(
  encryptedBuffer: Buffer,
  playAuth: string,
): { buffer: Buffer; contentType: string } {
  const keyHex = /^[0-9a-f]+$/i.test(playAuth) ? playAuth : decryptSpadeA(playAuth);
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 16) throw new Error('QISHUI_AUDIO_KEY_INVALID');

  const moov = findMp4Box(encryptedBuffer, 'moov');
  const trak = findMp4Box(encryptedBuffer, 'trak', moov.offset + 8, moov.offset + moov.size);
  const mdia = findMp4Box(encryptedBuffer, 'mdia', trak.offset + 8, trak.offset + trak.size);
  const minf = findMp4Box(encryptedBuffer, 'minf', mdia.offset + 8, mdia.offset + mdia.size);
  const stbl = findMp4Box(encryptedBuffer, 'stbl', minf.offset + 8, minf.offset + minf.size);
  const stsd = findMp4Box(encryptedBuffer, 'stsd', stbl.offset + 8, stbl.offset + stbl.size);
  const stsz = findMp4Box(encryptedBuffer, 'stsz', stbl.offset + 8, stbl.offset + stbl.size);
  let senc = findMp4Box(encryptedBuffer, 'senc', moov.offset + 8, moov.offset + moov.size);
  if (!senc.size) senc = findMp4Box(encryptedBuffer, 'senc', stbl.offset + 8, stbl.offset + stbl.size);
  const mdat = findMp4Box(encryptedBuffer, 'mdat');
  if (![moov, trak, mdia, minf, stbl, stsd, stsz, senc, mdat].every((box) => box.size)) {
    throw new Error('QISHUI_AUDIO_CONTAINER_INVALID');
  }

  // 先验证表长度，避免损坏的 count 字段触发数十亿个样本/IV 的分配。
  if (stsz.data.length < 12 || senc.data.length < 8) throw new Error('QISHUI_AUDIO_CONTAINER_INVALID');
  const sampleSize = stsz.data.readUInt32BE(4);
  const count = stsz.data.readUInt32BE(8);
  if (count !== senc.data.readUInt32BE(4)) throw new Error('QISHUI_AUDIO_SAMPLE_COUNT_MISMATCH');
  if ((sampleSize === 0 && count > (stsz.data.length - 12) / 4)
    || count > (senc.data.length - 8) / 8) {
    throw new Error('QISHUI_AUDIO_CONTAINER_INVALID');
  }
  let totalSampleBytes = 0;
  for (let index = 0; index < count; index += 1) {
    totalSampleBytes += sampleSize || stsz.data.readUInt32BE(12 + index * 4);
    if (totalSampleBytes > mdat.data.length) throw new Error('QISHUI_AUDIO_CONTAINER_INVALID');
  }
  const flacMetadata = findFlacMetadata(stsd.data);
  const isFlac = flacMetadata.length > 0;
  const output = isFlac
    ? Buffer.alloc(4 + flacMetadata.length + totalSampleBytes)
    : Buffer.from(encryptedBuffer);
  if (isFlac) {
    output.write('fLaC', 0, 'ascii');
    flacMetadata.copy(output, 4);
  }
  let readOffset = mdat.offset + 8;
  let writeOffset = isFlac ? 4 + flacMetadata.length : readOffset;
  const iv = Buffer.alloc(16);
  // 每个样本解密后立即写入最终输出，不再保留整曲的样本数组和额外拼接副本。
  for (let index = 0; index < count; index += 1) {
    const size = sampleSize || stsz.data.readUInt32BE(12 + index * 4);
    senc.data.copy(iv, 0, 8 + index * 8, 16 + index * 8);
    const decipher = createDecipheriv('aes-128-ctr', key, iv);
    for (let offset = 0; offset < size; offset += 64 * 1024) {
      const end = Math.min(offset + 64 * 1024, size);
      decipher.update(encryptedBuffer.subarray(readOffset + offset, readOffset + end)).copy(output, writeOffset + offset);
    }
    decipher.final();
    readOffset += size;
    writeOffset += size;
  }
  if (!isFlac) replaceEncryptedAudioType(output, stsd.offset, stsd.offset + stsd.size);
  return { buffer: output, contentType: isFlac ? 'audio/flac' : 'audio/mp4' };
}
