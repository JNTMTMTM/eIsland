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
 * @file mp4.ts
 * @description 汽水加密音频 MP4 容器盒定位工具。
 * @author 鸡哥
 */

export interface Mp4Box {
  size: number;
  type: string;
  offset: number;
  data: Buffer;
}

const EMPTY_BOX: Mp4Box = {
  size: 0,
  type: '',
  offset: 0,
  data: Buffer.alloc(0),
};

/**
 * 在指定 MP4 数据范围内查找顶层盒。
 * @param buffer - MP4 文件数据
 * @param boxType - 四字符盒类型
 * @param offset - 搜索起始偏移
 * @param end - 搜索结束偏移
 * @returns 匹配的 MP4 盒；未找到时返回空盒
 */
export function findMp4Box(
  buffer: Buffer,
  boxType: string,
  offset = 0,
  end = buffer.length,
): Mp4Box {
  let position = offset;
  while (position + 8 <= end) {
    const size = buffer.readUInt32BE(position);
    if (size < 8 || position + size > end) break;
    const type = buffer.subarray(position + 4, position + 8).toString('ascii');
    if (type === boxType) {
      return {
        size,
        type,
        offset: position,
        data: buffer.subarray(position + 8, position + size),
      };
    }
    position += size;
  }
  return EMPTY_BOX;
}