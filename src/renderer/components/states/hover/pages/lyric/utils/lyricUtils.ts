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
 * @file lyricUtils.ts
 * @description 歌词模块工具函数
 * @author 鸡哥
 */

/**
 * 按视觉宽度截断文本（支持中日韩多字节字符）
 * 中文/繁体汉字: 2em | 日文平假名/片假名: 2em | 韩文 Hangul: 2em | 其他: 1em
 * @param text - 原始文本
 * @param maxWidth - 最大视觉宽度（单位：半角字符数）
 * @returns 截断后的文本，超出时末尾追加省略号
 */
export function truncateByVisualWidth(text: string, maxWidth: number): string {
  let finalWidth = 0;
  let finalEnd = 0;
  Array.from(text).every((ch) => {
    const isEastAsianWide =
      /[一-鿿㐀-䶿　-〿＀-￯぀-ゟ゠-ヿ가-힯ᄀ-ᅟ㄰-㆏]/.test(ch);
    const charWidth = isEastAsianWide ? 2 : 1;
    if (finalWidth + charWidth > maxWidth - 1) return false;
    finalWidth += charWidth;
    finalEnd++;
    return true;
  });
  if (finalEnd === text.length) return text;
  return text.slice(0, finalEnd) + '…';
}
