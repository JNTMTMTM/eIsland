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
 * @file jpegExif.test.ts
 * @description 真实 JPEG/EXIF 解析覆盖大小端、所有字段、数据类型、损坏段及数值边界。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseJpegExif } from '../albumUtils';
import { jpeg, unsigned } from './jpegFixture';
import type { ExifEntry } from './jpegFixture';

const make: ExifEntry = { tag: 0x010F, type: 2, count: 6, bytes: [67, 97, 110, 111, 110, 0] };

describe('JPEG TIFF parsing', () => {
  it.each([true, false])('parses all fields, endian little=%s', (little) => {
    const input = jpeg([make, { tag: 0x0110, type: 2, count: 4, bytes: [82, 53, 0, 0] }], [
      { tag: 0x9003, type: 2, count: 20, bytes: [...Buffer.from('2026:01:02 03:04:05'), 0] },
      { tag: 0x829A, type: 5, count: 1, bytes: unsigned([1, 250], 4, little) },
      { tag: 0x829D, type: 5, count: 1, bytes: unsigned([28, 10], 4, little) },
      { tag: 0x8827, type: 3, count: 1, bytes: unsigned([100], 2, little) },
      { tag: 0x920A, type: 5, count: 1, bytes: unsigned([351, 10], 4, little) },
    ], little);
    expect(parseJpegExif(input)).toEqual({ make: 'Canon', model: 'R5', dateTimeOriginal: '2026:01:02 03:04:05', exposureTime: '1/250s', fNumber: 2.8, iso: 100, focalLength: 35.1 });
  });
  it.each([{ num: 2, den: 1, expected: '2s' }, { num: 3, den: 2, expected: '1.5s' }, { num: 0, den: 250, expected: '1/250s' }, { num: 1, den: 0, expected: '-' }])('exposure $num/$den', ({ num, den, expected }) => {
    expect(parseJpegExif(jpeg([], [{ tag: 0x829A, type: 5, count: 1, bytes: unsigned([num, den]) }]))).toEqual({ exposureTime: expected });
  });
  it('supports LONG ISO and ignores zero denominators', () => {
    expect(parseJpegExif(jpeg([], [
      { tag: 0x8827, type: 4, count: 1, bytes: unsigned([25600]) },
      { tag: 0x829D, type: 5, count: 1, bytes: unsigned([1, 0]) },
      { tag: 0x920A, type: 5, count: 1, bytes: unsigned([1, 0]) },
    ]))).toEqual({ iso: 25600 });
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 99])('unknown tag data type %s remains harmless', (type) => {
    expect(parseJpegExif(jpeg([make, { type, tag: 0xEEEE, count: 1, bytes: Array<number>(8).fill(0) }]))).toEqual({ make: 'Canon' });
  });
  it.each([0x829A, 0x829D, 0x920A])('ignores non-RATIONAL or empty rational tag %s', (tag) => {
    expect(parseJpegExif(jpeg([make], [{ tag, type: 4, count: 1, bytes: unsigned([100]) }, { tag, type: 5, count: 0 }]))).toEqual({ make: 'Canon' });
  });
  it('ignores unsupported ISO data type and unknown sub-IFD tags', () => {
    expect(parseJpegExif(jpeg([make], [{ tag: 0x8827, type: 1, count: 1, bytes: [100] }, { tag: 0xEEEE, type: 1, count: 1 }]))).toEqual({ make: 'Canon' });
  });
  it('returns undefined without recognized nonempty metadata', () => {
    expect(parseJpegExif(jpeg([]))).toBeUndefined();
    expect(parseJpegExif(jpeg([{ tag: 0x010F, type: 2, count: 4, bytes: [32, 0, 0, 0] }]))).toBeUndefined();
  });
  it('handles recognized fields independently of a camera make', () => {
    expect(parseJpegExif(jpeg([{ tag: 0x0110, type: 2, count: 2, bytes: [77, 0] }]))).toEqual({ model: 'M' });
    expect(parseJpegExif(jpeg([], [{ tag: 0x9003, type: 2, count: 2, bytes: [68, 0] }]))).toEqual({ dateTimeOriginal: 'D' });
    expect(parseJpegExif(jpeg([], [{ tag: 0x829D, type: 5, count: 1, bytes: unsigned([1, 2]) }]))).toEqual({ fNumber: 0.5 });
    expect(parseJpegExif(jpeg([], [{ tag: 0x920A, type: 5, count: 1, bytes: unsigned([1, 2]) }]))).toEqual({ focalLength: 0.5 });
  });
  it('parses a subarray using its byteOffset', () => {
    const original = jpeg([make]);
    const padded = new Uint8Array(original.length + 10);
    padded.set(original, 10);
    expect(parseJpegExif(padded.subarray(10))).toEqual({ make: 'Canon' });
  });
  it('skips a non-EXIF APP segment before the EXIF segment', () => {
    const original = jpeg([make]);
    const prefixed = new Uint8Array(original.length + 4);
    prefixed.set([255, 216, 255, 224, 0, 2]);
    prefixed.set(original.subarray(2), 6);
    expect(parseJpegExif(prefixed)).toEqual({ make: 'Canon' });
  });
  it.each([0, 1, 2, 3, 5, 9, 12, 17, 20, 25, 31])('truncated JPEG length %s safely returns undefined', (length) => {
    expect(parseJpegExif(jpeg([make]).subarray(0, length))).toBeUndefined();
  });
  it.each([0, 1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14])('rejects malformed JPEG/EXIF header byte %s', (offset) => {
    const bytes = jpeg([make]);
    bytes[offset] ^= 1;
    expect(parseJpegExif(bytes)).toBeUndefined();
  });
  it('rejects invalid segment length and handles no APP1', () => {
    const input = jpeg([make]);
    input[4] = 0;
    input[5] = 1;
    expect(parseJpegExif(input)).toBeUndefined();
    expect(parseJpegExif(new Uint8Array([255, 216, 255, 224, 0, 2, 0]))).toBeUndefined();
  });
  it('ignores out-of-bounds IFD and field payloads', () => {
    const ifd = jpeg([make]);
    new DataView(ifd.buffer).setUint32(16, 999999, true);
    expect(parseJpegExif(ifd)).toBeUndefined();
    expect(parseJpegExif(jpeg([{ tag: 0x010F, type: 2, count: 20, pointer: 999999 }]))).toBeUndefined();
    expect(parseJpegExif(jpeg([make], [{ tag: 0x8769, type: 4, count: 1, pointer: 999999 }]))).toEqual({ make: 'Canon' });
  });
});
