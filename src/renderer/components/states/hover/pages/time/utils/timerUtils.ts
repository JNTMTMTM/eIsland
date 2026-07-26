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
 * @file timerUtils.ts
 * @description 计时器相关工具函数
 * @author 鸡哥
 */

/**
 * 数字补零
 * @param value - 数值
 * @returns 两位字符串
 */
export function padZero(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * 将总秒数拆分为时/分/秒
 * @param totalSeconds - 总秒数
 * @returns 时分秒对象
 */
export function getTimeParts(totalSeconds: number): { h: number; m: number; s: number } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
}
