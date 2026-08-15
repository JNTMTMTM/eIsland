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
 * @file calculatorTypes.ts
 * @description 计算器模块类型定义。
 * @author 鸡哥
 */

export type CalcOperator = '+' | '-' | '×' | '÷';
export type CalcButtonAction =
  | 'digit'
  | 'operator'
  | 'equals'
  | 'clear'
  | 'backspace'
  | 'dot'
  | 'toggleSign'
  | 'percentage'
  | 'scientific';

export type ScientificFn =
  | 'sin' | 'cos' | 'tan'
  | 'arcsin' | 'arccos' | 'arctan'
  | 'log' | 'ln'
  | 'sqrt' | 'cbrt' | 'nthroot'
  | 'square' | 'cube' | 'reciprocal'
  | 'factorial' | 'abs'
  | 'pi' | 'e'
  | 'pow' | 'exp';

export interface CalcState {
  formula: string;
  result: string | null;
  cursor: number;
}

export interface UseCalculatorReturn {
  formula: string;
  result: string | null;
  cursor: number;
  inputDigit: (digit: string) => void;
  inputDot: () => void;
  inputOperator: (operator: CalcOperator) => void;
  inputText: (text: string) => void;
  calculate: () => void;
  clear: () => void;
  backspace: () => void;
  deleteForward: () => void;
  moveCursor: (position: number) => void;
  toggleSign: () => void;
  percentage: () => void;
  applyScientific: (fn: ScientificFn) => void;
  currentValue: number;
}

export interface CalcButtonDef {
  label?: string;
  icon?: string;
  alt: string;
  action: CalcButtonAction;
  value?: string;
  className?: string;
}

export type CalcMode = 'arithmetic' | 'scientific' | 'coordinate' | 'unitConversion';

export interface CalcSidebarNavItem {
  mode: CalcMode;
  icon: string;
  labelKey: string;
  defaultLabel: string;
}