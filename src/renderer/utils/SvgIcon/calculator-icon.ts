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
 * @file calculator-icon.ts
 * @description 计算器模块图标路径枚举
 * @author 鸡哥
 */

export const CalculatorIcon = {
  BACKSPACE: './svg/calculator/BACKSPACE.svg',
  DIVISION: './svg/calculator/DIVISION.svg',
  MINUS: './svg/calculator/MINUS.svg',
  MULTIPLICATION: './svg/calculator/MULTIPLICATION.svg',
  PLUS: './svg/calculator/PLUS.svg',
  PLUS_MINUS: './svg/calculator/PLUS_MINUS.svg',
} as const;

export type CalculatorIconKey = keyof typeof CalculatorIcon;
