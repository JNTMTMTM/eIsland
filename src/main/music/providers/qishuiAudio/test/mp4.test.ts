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
 * @file mp4.test.ts
 * @description MP4 box查找：多区块、范围限制、截断和不存在的边界。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { findMp4Box } from '../mp4';
/**
 * 构造带标准8字节头的MP4数据块。
 * @param type - 四字符类型。
 * @param payload - 数据载荷。
 * @returns 可拼接的数据块。
 */

function box(type: string, payload = ''): Buffer {
  const data = Buffer.from(payload);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + data.length);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, data]);
}

describe('findMp4Box', () => {
  it('跳过无关box并返回目标的位置、大小和载荷', () => {
    const first = box('ftyp', 'a');
    const target = box('mdat', 'music');
    const result = findMp4Box(Buffer.concat([first, target]), 'mdat');
    expect(result).toEqual({
      size: 13,
      type: 'mdat',
      offset: 9,
      data: Buffer.from('music')
    });
  });

  it('显式offset/end限制查找窗口，空目标载荷合法', () => {
    const first = box('mdat', 'first');
    const second = box('mdat');
    const data = Buffer.concat([first, second]);
    expect(findMp4Box(data, 'mdat', first.length)).toEqual({
      size: 8,
      type: 'mdat',
      offset: first.length,
      data: Buffer.alloc(0)
    });
    expect(findMp4Box(data, 'mdat', 0, first.length - 1).size).toBe(0);
  });

  it.each([
    Buffer.alloc(0),
    Buffer.alloc(7),
    Buffer.from([0, 0, 0, 7, 109, 100, 97, 116]),
    Buffer.from([0, 0, 0, 20, 109, 100, 97, 116])
  ])('截断或无效长度不继续读取', (data) => {
    expect(findMp4Box(data, 'mdat')).toEqual({
      size: 0,
      type: '',
      offset: 0,
      data: Buffer.alloc(0)
    });
  });

  it('不存在的类型返回空结果', () => {
    expect(findMp4Box(box('ftyp'), 'mdat').size).toBe(0);
  });
});
