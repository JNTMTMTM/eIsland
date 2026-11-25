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
 * @file explorerFormat.ts
 * @description 格式化文件列表的文件大小。
 * @author 鸡哥
 */
/**
 * 根据当前语言选择单位格式，文件夹和缺失的元数据显示为空。
 * @param bytes - 文件字节数。
 * @param language - 当前语言。
 * @returns 可读的文件大小。
 */
export default function formatSize(bytes: number | null, language: string): string {
  if (bytes === null) return '';
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1000)));
  return new Intl.NumberFormat(language, {
    style: 'unit', unit: units[index], unitDisplay: 'short', maximumFractionDigits: 1,
  }).format(bytes / (1000 ** index));
}
