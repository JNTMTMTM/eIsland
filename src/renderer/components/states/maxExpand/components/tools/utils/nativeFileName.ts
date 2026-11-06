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
 * @file nativeFileName.ts
 * @description 将原生及旧版 Windows OsString 文件名转换为安全的界面文本。
 * @author 鸡哥
 */

/**
 * 兼容历史 UTF-16 文件名，避免把旧原生序列化对象传给 React。
 * @param value - 原生或持久化历史中的文件名。
 * @param fallback - 文件名缺失或格式无效时使用的路径或 URL。
 * @returns 可直接渲染的文件名字符串。
 */
export default function normalizeNativeFileName(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value || fallback;
  if (value && typeof value === 'object' && 'Windows' in value) {
    const units = value.Windows;
    if (Array.isArray(units) && units.every((unit: unknown) => typeof unit === 'number' && Number.isInteger(unit) && unit >= 0 && unit <= 0xffff)) {
      return units.map((unit: number) => String.fromCharCode(unit)).join('') || fallback;
    }
  }
  return fallback;
}
