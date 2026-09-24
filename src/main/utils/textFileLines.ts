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
 * @file textFileLines.ts
 * @description 分块读取日志，避免为历史会话分配整份文件及其行数组。
 * @author 鸡哥
 */

import { closeSync, fstatSync, openSync, readSync } from 'fs';
import { StringDecoder } from 'string_decoder';

const READ_CHUNK_BYTES = 64 * 1024;

/**
 * 逐行读取 UTF-8 文件，提前结束迭代时也会关闭文件句柄。
 * @param filePath - 日志文件路径
 * @returns 不含换行符的文本行
 */
export function* readTextLinesSync(filePath: string): Generator<string> {
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(READ_CHUNK_BYTES);
    const decoder = new StringDecoder('utf8');
    const {size} = fstatSync(fd);
    let position = 0;
    let parts: string[] = [];
    while (position < size) {
      const count = readSync(fd, buffer, 0, Math.min(buffer.length, size - position), position);
      if (count === 0) break;
      position += count;
      const text = decoder.write(buffer.subarray(0, count));
      let start = 0;
      let end = text.indexOf('\n');
      while (end >= 0) {
        parts.push(text.slice(start, end));
        const line = parts.join('').replace(/\r$/, '');
        parts = [];
        yield line;
        start = end + 1;
        end = text.indexOf('\n', start);
      }
      // 只扫描新块，含大幅图片的单行日志也不会反复拼接、扫描整行。
      if (start < text.length) parts.push(text.slice(start));
    }
    const tail = decoder.end();
    if (tail) parts.push(tail);
    if (parts.length) {
      const line = parts.join('').replace(/\r$/, '');
      parts = [];
      yield line;
    }
  } finally {
    closeSync(fd);
  }
}

/**
 * 从文件末尾读取指定行数，按由旧到新的顺序返回。
 * @param filePath - UTF-8 日志文件路径
 * @param limit - 最多保留的行数
 * @returns 最近的文本行，忽略文件末尾空白
 */
export function readLastTextLinesSync(filePath: string, limit: number): string[] {
  if (limit <= 0) return [];
  const fd = openSync(filePath, 'r');
  try {
    let position = fstatSync(fd).size;
    let parts: Buffer[] = [];
    const lines: string[] = [];
    while (position > 0 && lines.length < limit) {
      const size = Math.min(position, READ_CHUNK_BYTES);
      position -= size;
      const buffer = Buffer.allocUnsafe(size);
      const count = readSync(fd, buffer, 0, size, position);
      let end = count;
      for (let index = count - 1; index >= 0; index -= 1) {
        if (buffer[index] !== 10) continue;
        parts.push(buffer.subarray(index + 1, end));
        const line = Buffer.concat(parts.reverse()).toString('utf8').replace(/\r$/, '');
        parts = [];
        if (lines.length > 0 || line.trim()) lines.push(line);
        if (lines.length === limit) return lines.reverse();
        end = index;
      }
      parts.push(buffer.subarray(0, end));
    }
    const first = Buffer.concat(parts.reverse()).toString('utf8').trimStart()
      .replace(/\r$/, '');
    if (first.trim() || lines.length > 0) lines.push(first);
    return lines.reverse();
  } finally {
    closeSync(fd);
  }
}
