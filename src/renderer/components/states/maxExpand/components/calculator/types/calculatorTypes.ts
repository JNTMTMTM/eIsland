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

import type { CalculatorErrorCode } from '../utils/calculatorErrorUtils';

export type CalcOperator = '+' | '-' | '×' | '÷';
/** 三角函数输入与反三角函数输出使用的角度单位。 */
export type CalcAngleUnit = 'degree' | 'radian';
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
  | 'log' | 'ln' | 'logn'
  | 'sqrt' | 'cbrt' | 'nthroot'
  | 'square' | 'cube' | 'reciprocal'
  | 'factorial' | 'abs'
  | 'pi' | 'e'
  | 'pow' | 'exp' | 'variable'
  | 'fraction' | 'sum' | 'integral' | 'derivative';

export type FormulaStructureKind = 'logn' | 'fraction' | 'sum' | 'integral' | 'derivative' | 'sqrt' | 'root';
export type FormulaSlotName = 'base' | 'value' | 'numerator' | 'denominator' | 'body' | 'lower' | 'upper' | 'point' | 'index' | 'radicand';

export interface FormulaStructure {
  id: string;
  kind: FormulaStructureKind;
  slots: Partial<Record<FormulaSlotName, FormulaDocument>>;
}

export type FormulaSegment =
  | { type: 'text'; value: string }
  | { type: 'structure'; value: FormulaStructure };

export interface FormulaDocument {
  segments: FormulaSegment[];
}

export interface FormulaPathStep {
  segmentIndex: number;
  slot: FormulaSlotName;
}

export interface FormulaCursor {
  path: FormulaPathStep[];
  segmentIndex: number;
  offset: number;
}

export interface CalcState {
  errorCode?: CalculatorErrorCode | null;
  answer: number | null;
  document: FormulaDocument;
  result: string | null;
  cursor: FormulaCursor;
}

export interface UseCalculatorReturn {
  errorCode?: CalculatorErrorCode | null;
  document: FormulaDocument;
  formula: string;
  result: string | null;
  cursor: FormulaCursor;
  angleUnit: CalcAngleUnit;
  setAngleUnit: (unit: CalcAngleUnit) => void;
  restoreFormula: (document: FormulaDocument, unit: CalcAngleUnit) => void;
  answer: number | null;
  inputAnswer: () => void;
  inputDigit: (digit: string) => void;
  inputDot: () => void;
  inputOperator: (operator: CalcOperator) => void;
  inputText: (text: string) => void;
  calculate: () => void;
  clear: () => void;
  backspace: () => void;
  deleteForward: () => void;
  moveCursor: (cursor: FormulaCursor) => void;
  moveCursorHorizontal: (direction: -1 | 1) => void;
  moveCursorBoundary: (boundary: 'start' | 'end') => void;
  toggleSign: () => void;
  percentage: () => void;
  applyScientific: (fn: ScientificFn) => void;
  currentValue: number;
}

export interface CalcButtonDef {
  label?: string;
  /** 按键上的数学排版，仅接受内置 TeX。 */
  tex?: string;
  icon?: string;
  alt: string;
  /** i18n 可访问名称键 */
  labelKey?: string;
  action: CalcButtonAction;
  value?: string;
  className?: string;
}

export type CalcMode = 'arithmetic' | 'scientific' | 'coordinate' | 'unitConversion' | 'equation' | 'complex';

export interface CalcSidebarNavItem {
  mode: CalcMode;
  icon: string;
  labelKey: string;
  defaultLabel: string;
}
