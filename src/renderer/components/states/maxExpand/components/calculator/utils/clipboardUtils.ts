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
 * @file clipboardUtils.ts
 * @description 外部数学公式的纯文本粘贴处理。
 * @author 鸡哥
 */

/** 归一化从外部粘贴的纯文本数学公式。
 * @param text - 剪贴板中的公式文本
 * @returns 使用计算器运算符和函数名的公式
 */
export function normalizePastedFormula(text: string): string {
  if (text.length > 5000) throw new Error('Formula too long');
  return text.trim().replace(/^y\s*=\s*/i, '').replaceAll('−', '-').replaceAll('–', '-')
    .replaceAll('＊', '*').replaceAll('／', '/').replaceAll('²', '^2').replaceAll('³', '^3')
    .replace(/√\s*\(/g, 'sqrt(').replace(/\basin\(/gi, 'arcsin(').replace(/\bacos\(/gi, 'arccos(').replace(/\batan\(/gi, 'arctan(')
    .replace(/\bpi\b/gi, 'π').replace(/\s+/g, '');
}
