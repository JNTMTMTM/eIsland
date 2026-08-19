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

import { ORB_COLOR_A_OFFSET, ORB_COLOR_B_OFFSET } from '../config/uniformDefaults';

/**
 * 将 hex 颜色字符串转换为 [r, g, b] 归一化浮点数组（0~1）。
 * 对无效输入返回 [0, 0, 0] 而非 NaN，避免污染 uniform 缓冲区。
 * @param hex - 十六进制颜色字符串，如 '#d86bff'。
 * @returns 归一化 RGB 三元组。
 */
export function hexToRgbFloat(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0];
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

/**
 * 将用户自定义的 orb 颜色 A/B 写入 uniform 种子数据的对应槽位。
 * 若两个颜色均未提供则返回 undefined，由调用方使用默认种子。
 * @param seed - 默认 uniform 种子数组。
 * @param colorA - 可选的 A 颜色 hex 字符串。
 * @param colorB - 可选的 B 颜色 hex 字符串。
 * @returns 覆盖后的 Float32Array，或 undefined。
 */
export function applyOrbColorsToUniforms(
  seed: readonly number[],
  colorA?: string | null,
  colorB?: string | null,
): Float32Array | undefined {
  if (!colorA && !colorB) return undefined;
  const data = new Float32Array(seed);
  if (colorA) {
    const [r, g, b] = hexToRgbFloat(colorA);
    data[ORB_COLOR_A_OFFSET] = r;
    data[ORB_COLOR_A_OFFSET + 1] = g;
    data[ORB_COLOR_A_OFFSET + 2] = b;
    data[ORB_COLOR_A_OFFSET + 3] = 1.0;
  }
  if (colorB) {
    const [r, g, b] = hexToRgbFloat(colorB);
    data[ORB_COLOR_B_OFFSET] = r;
    data[ORB_COLOR_B_OFFSET + 1] = g;
    data[ORB_COLOR_B_OFFSET + 2] = b;
    data[ORB_COLOR_B_OFFSET + 3] = 1.0;
  }
  return data;
}
