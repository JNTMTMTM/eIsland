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
 * @file utils/color.ts
 * @description 液态玻璃球颜色转换工具。
 * @author 鸡哥
 */

/**
 * 将 hex 颜色字符串转换为 [r, g, b] 归一化浮点数组（0~1）。
 * @param hex - 十六进制颜色字符串，如 '#d86bff'。
 * @returns 归一化 RGB 三元组。
 */
export function hexToRgbFloat(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * 将 [r, g, b] 归一化浮点数组转换为 hex 颜色字符串。
 * @param rgb - 归一化 RGB 三元组（0~1）。
 * @returns 十六进制颜色字符串。
 */
export function rgbFloatToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  const toHex = (v: number): string =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
