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

/** 计算器模块图标；COLLAPSE / EXPAND 复用 eIsland 共享图标（./svg/ 根目录） */
export const CalculatorIcon = {
  ARITHMETIC: './svg/calculator/ARITHMETIC.svg',
  BACKSPACE: './svg/calculator/BACKSPACE.svg',
  CLEAR: './svg/calculator/CLEAR.svg',
  COLLAPSE: './svg/COLLAPSE.svg',
  COORDINATE: './svg/calculator/COORDINATE.svg',
  DIVISION: './svg/calculator/DIVISION.svg',
  EXPAND: './svg/EXPAND.svg',
  FRACTION: './svg/calculator/FRACTION.svg',
  INTEGRATION: './svg/calculator/INTEGRATION.svg',
  MINUS: './svg/calculator/MINUS.svg',
  MULTIPLICATION: './svg/calculator/MULTIPLICATION.svg',
  N_ROOT: './svg/calculator/N_ROOT.svg',
  PERCENTAGE: './svg/calculator/PERCENTAGE.svg',
  PI: './svg/calculator/PI.svg',
  PLUS: './svg/calculator/PLUS.svg',
  PLUS_MINUS: './svg/calculator/PLUS_MINUS.svg',
  ROOT: './svg/calculator/ROOT.svg',
  SCIENTIFIC: './svg/calculator/SCIENTIFIC.svg',
  SIGMA: './svg/calculator/SIGMA.svg',
} as const;

export type CalculatorIconKey = keyof typeof CalculatorIcon;
