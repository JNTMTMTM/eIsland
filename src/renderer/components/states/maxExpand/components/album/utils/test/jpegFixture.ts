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
 * @file jpegFixture.ts
 * @description 独立 JPEG APP1/TIFF 二进制夹具，按 EXIF 文件格式构造真实解析输入。
 * @author 鸡哥
 */

export interface ExifEntry {
  tag: number;
  type: number;
  count: number;
  bytes?: number[];
  pointer?: number;
}

/**
 * 按 TIFF 条目结构写入 IFD，超过四字节的数据存放在独立数据区。
 * @param entries - 原始标签、类型、元素数量以及字段字节。
 * @param exifEntries - 可选的 Exif 子目录字段。
 * @param little - true 使用 II 小端，false 使用 MM 大端。
 * @returns 完整 JPEG 缓冲区，可再截断或修改以验证损坏输入。
 */
export function jpeg(entries: ExifEntry[], exifEntries: ExifEntry[] = [], little = true): Uint8Array {
  const bytes = new Uint8Array(2048);
  const view = new DataView(bytes.buffer);
  bytes.set([0xFF, 0xD8, 0xFF, 0xE1, 0x07, 0xFA, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  bytes.set(little ? [0x49, 0x49] : [0x4D, 0x4D], 12);
  view.setUint16(14, 42, little);
  view.setUint32(16, 8, little);
  let payload = 1024;
  const write = (offset: number, rows: ExifEntry[]): void => {
    view.setUint16(offset, rows.length, little);
    rows.forEach((entry, index) => {
      const start = offset + 2 + index * 12;
      view.setUint16(start, entry.tag, little);
      view.setUint16(start + 2, entry.type, little);
      view.setUint32(start + 4, entry.count, little);
      if (entry.pointer !== undefined) {
        view.setUint32(start + 8, entry.pointer, little);
      } else if ((entry.bytes?.length ?? 0) <= 4) {
        bytes.set(entry.bytes ?? [], start + 8);
      } else {
        view.setUint32(start + 8, payload - 12, little);
        bytes.set(entry.bytes!, payload);
        payload += entry.bytes!.length;
      }
    });
  };
  write(20, exifEntries.length > 0 ? [...entries, { tag: 0x8769, type: 4, count: 1, pointer: 500 }] : entries);
  if (exifEntries.length > 0) {
    write(512, exifEntries);
  }
  return bytes;
}

/**
 * 编码 TIFF 无符号数。
 * @param values - 一个或多个无符号值。
 * @param width - 2 为 SHORT，4 为 LONG；两个 LONG 可构成 RATIONAL。
 * @param little - 对应文件字节序。
 * @returns 按指定字节序编码的字段字节。
 */
export function unsigned(values: number[], width = 4, little = true): number[] {
  const bytes = new Uint8Array(values.length * width);
  const view = new DataView(bytes.buffer);
  values.forEach((value, index) => {
    if (width === 2) {
      view.setUint16(index * width, value, little);
    } else {
      view.setUint32(index * width, value, little);
    }
  });
  return [...bytes];
}
