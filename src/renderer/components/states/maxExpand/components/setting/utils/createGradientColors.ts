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
 * @file createGradientColors.ts
 * @description 根据时钟渐变主色推导首尾颜色，保留既有色相与亮度规则
 * @author 鸡哥
 */

interface GradientColors {
  start: string;
  middle: string;
  end: string;
}

/**
 * 为渐变时钟保留主色并派生首尾颜色。
 * @param value - 六位十六进制颜色，包含 # 前缀
 * @returns 渐变颜色；格式不合法时返回 null
 */
export function createGradientColors(value: string): GradientColors | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (!match) {
    return null;
  }
  const hex = match[1];
  const ri = parseInt(hex.slice(0, 2), 16) / 255;
  const gi = parseInt(hex.slice(2, 4), 16) / 255;
  const bi = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(ri, gi, bi);
  const min = Math.min(ri, gi, bi);
  let h = 0;
  const l = (max + min) / 2;
  const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
  if (max !== min) {
    const d = max - min;
    if (max === ri) h = ((gi - bi) / d + (gi < bi ? 6 : 0)) * 60;
    else if (max === gi) h = ((bi - ri) / d + 2) * 60;
    else h = ((ri - gi) / d + 4) * 60;
  }
  const hslToHex = (hue: number, sat: number, lit: number): string => {
    const hh = ((hue % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * lit - 1)) * sat;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = lit - c / 2;
    let rr: number;
    let gg: number;
    let bb: number;
    if (hh < 60) { rr = c; gg = x; bb = 0; }
    else if (hh < 120) { rr = x; gg = c; bb = 0; }
    else if (hh < 180) { rr = 0; gg = c; bb = x; }
    else if (hh < 240) { rr = 0; gg = x; bb = c; }
    else if (hh < 300) { rr = x; gg = 0; bb = c; }
    else { rr = c; gg = 0; bb = x; }
    const toH = (n: number): string => Math.max(0, Math.min(255, Math.round((n + m) * 255))).toString(16).padStart(2, '0');
    return `#${toH(rr)}${toH(gg)}${toH(bb)}`;
  };
  const start = hslToHex(h - 25, Math.min(1, s * 1.08), Math.min(0.78, l + 0.1));
  const end = hslToHex(h + 25, Math.min(1, s * 1.05), Math.max(0.3, l - 0.06));

  return { start, middle: value, end };
}
