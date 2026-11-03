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
 * @file outputBuffer.ts
 * @description 将子进程输出流切分为可在面板中逐行渲染的文本
 * @author 鸡哥
 */

/** 输出切分结果 */
export interface SplitResult {
  /** 已完整结束的行 */
  complete: string[];
  /** 尚未遇到换行符的末尾片段 */
  partial: string;
}

// 子进程输出被渲染进固定面板，光标移动、清屏等控制序列会破坏布局，只保留 SGR 颜色序列。
// eslint-disable-next-line no-control-regex -- 需匹配 ESC 与 BEL 控制字符
const CONTROL_SEQUENCE = /\u001B\[[0-9;?]*[A-Za-ln-z]|\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)|\u001B[()][A-Z0-9]|\u001B[=>78]/g;

/**
 * 清理单行输出
 * @description 进度条通过 `\r` 回到行首覆盖，仅保留最后一次覆盖的内容
 * @param line - 不含换行符的原始行
 * @returns 可安全渲染的文本
 */
export function sanitizeLine(line: string): string {
  const segments = line.split('\r').filter(Boolean);
  return (segments.at(-1) ?? '').replace(CONTROL_SEQUENCE, '').replace(/\t/g, '  ');
}

/** 残留片段的最大长度，超出后强制断行，避免长时间不换行的输出无限占用内存 */
export const MAX_PARTIAL_LENGTH = 64 * 1024;

/**
 * 压缩残留片段
 * @description 进度条以 `\r` 反复覆盖同一行，只需保留最后一次覆盖；
 * 末尾的 `\r` 可能是被数据块切开的 `\r\n`，需连同它之前的一段一起保留
 * @param partial - 未遇到换行符的末尾片段
 * @returns 渲染结果相同但不含已被覆盖内容的片段
 */
function compactPartial(partial: string): string {
  const searchFrom = partial.endsWith('\r') ? partial.length - 2 : partial.length - 1;
  const index = searchFrom < 0 ? -1 : partial.lastIndexOf('\r', searchFrom);
  return index > 0 ? partial.slice(index) : partial;
}

/**
 * 将新到达的数据块与上次残留片段拼接后按行切分
 * @param partial - 上次残留的未完成片段
 * @param chunk - 新到达的数据块
 * @returns 完整行（已清理）与新的残留片段（未清理，长度不超过 MAX_PARTIAL_LENGTH）
 */
export function splitChunk(partial: string, chunk: string): SplitResult {
  const parts = `${partial}${chunk}`.split(/\r?\n/);
  let rest = compactPartial(parts.pop() ?? '');
  const complete = parts.map(sanitizeLine);
  while (rest.length > MAX_PARTIAL_LENGTH) {
    complete.push(sanitizeLine(rest.slice(0, MAX_PARTIAL_LENGTH)));
    rest = rest.slice(MAX_PARTIAL_LENGTH);
  }
  return { complete, partial: rest };
}
