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
 * @file calculatorConfig.ts
 * @description 计算器模块常量与按钮布局配置
 * @author 鸡哥
 */

import { CalculatorIcon } from '../../../../../../utils/SvgIcon';
import { createInitialFormula } from '../utils/formulaDocumentUtils';
import type { CalcState, CalcButtonDef, CalcSidebarNavItem } from '../types/calculatorTypes';

const INITIAL_FORMULA = createInitialFormula();

/** 计算器初始状态 */
export const INITIAL_STATE: CalcState = {
  document: INITIAL_FORMULA.document,
  result: null,
  cursor: INITIAL_FORMULA.cursor,
};

/** 侧边栏导航项 */
export const CALC_SIDEBAR_NAV_ITEMS: CalcSidebarNavItem[] = [
  { mode: 'arithmetic', icon: CalculatorIcon.ARITHMETIC, labelKey: 'calculator.modes.arithmetic', defaultLabel: '四则运算' },
  { mode: 'scientific', icon: CalculatorIcon.SCIENTIFIC, labelKey: 'calculator.modes.scientific', defaultLabel: '科学计算' },
  { mode: 'coordinate', icon: CalculatorIcon.COORDINATE, labelKey: 'calculator.modes.coordinate', defaultLabel: '绘图' },
];

/** 四则运算按钮布局（5×4 网格） */
export const BUTTON_LAYOUT: CalcButtonDef[][] = [
  [
    { label: 'C', alt: 'C', action: 'clear', className: 'calc-btn-func' },
    { tex: '\\pm', alt: '±', action: 'toggleSign', className: 'calc-btn-func' },
    { tex: '\\%', alt: '%', action: 'percentage', className: 'calc-btn-func' },
    { tex: '\\div', alt: '÷', action: 'operator', value: '÷', className: 'calc-btn-op' },
  ],
  [
    { label: '7', alt: '7', action: 'digit', value: '7' },
    { label: '8', alt: '8', action: 'digit', value: '8' },
    { label: '9', alt: '9', action: 'digit', value: '9' },
    { tex: '\\times', alt: '×', action: 'operator', value: '×', className: 'calc-btn-op' },
  ],
  [
    { label: '4', alt: '4', action: 'digit', value: '4' },
    { label: '5', alt: '5', action: 'digit', value: '5' },
    { label: '6', alt: '6', action: 'digit', value: '6' },
    { tex: '-', alt: '-', action: 'operator', value: '-', className: 'calc-btn-op' },
  ],
  [
    { label: '1', alt: '1', action: 'digit', value: '1' },
    { label: '2', alt: '2', action: 'digit', value: '2' },
    { label: '3', alt: '3', action: 'digit', value: '3' },
    { tex: '+', alt: '+', action: 'operator', value: '+', className: 'calc-btn-op' },
  ],
  [
    { label: '0', alt: '0', action: 'digit', value: '0' },
    { label: '.', alt: '.', action: 'dot' },
    { icon: CalculatorIcon.BACKSPACE, alt: '⌫', action: 'backspace' },
    { label: '=', alt: '=', action: 'equals', className: 'calc-btn-equals' },
  ],
];

/** 科学函数按钮布局（5×4 网格，仅科学函数，与四则运算左右并排） */
export const SCIENTIFIC_FN_LAYOUT: CalcButtonDef[][] = [
  [
    { label: 'sin', tex: '\\sin', alt: 'sin', action: 'scientific', value: 'sin', className: 'calc-btn-sci' },
    { label: 'cos', tex: '\\cos', alt: 'cos', action: 'scientific', value: 'cos', className: 'calc-btn-sci' },
    { label: 'tan', tex: '\\tan', alt: 'tan', action: 'scientific', value: 'tan', className: 'calc-btn-sci' },
    { label: 'π', tex: '\\pi', alt: 'π', action: 'scientific', value: 'pi', className: 'calc-btn-sci' },
  ],
  [
    { label: 'sin⁻¹', tex: '\\sin^{-1}', alt: 'sin⁻¹', action: 'scientific', value: 'arcsin', className: 'calc-btn-sci' },
    { label: 'cos⁻¹', tex: '\\cos^{-1}', alt: 'cos⁻¹', action: 'scientific', value: 'arccos', className: 'calc-btn-sci' },
    { label: 'tan⁻¹', tex: '\\tan^{-1}', alt: 'tan⁻¹', action: 'scientific', value: 'arctan', className: 'calc-btn-sci' },
    { label: 'e', tex: 'e', alt: 'e', action: 'scientific', value: 'e', className: 'calc-btn-sci' },
  ],
  [
    { label: 'x²', tex: 'x^2', alt: 'x²', action: 'scientific', value: 'square', className: 'calc-btn-sci' },
    { label: 'x³', tex: 'x^3', alt: 'x³', action: 'scientific', value: 'cube', className: 'calc-btn-sci' },
    { label: 'x!', tex: 'x!', alt: 'x!', action: 'scientific', value: 'factorial', className: 'calc-btn-sci' },
    { label: 'eˣ', tex: 'e^x', alt: 'eˣ', action: 'scientific', value: 'exp', className: 'calc-btn-sci' },
  ],
  [
    { label: '√', tex: '\\sqrt{x}', alt: '√', action: 'scientific', value: 'sqrt', className: 'calc-btn-sci' },
    { label: '∛', tex: '\\sqrt[3]{x}', alt: '∛', action: 'scientific', value: 'cbrt', className: 'calc-btn-sci' },
    { label: 'log', tex: '\\log', alt: 'log', action: 'scientific', value: 'log', className: 'calc-btn-sci' },
    { label: 'ln', tex: '\\ln', alt: 'ln', action: 'scientific', value: 'ln', className: 'calc-btn-sci' },
  ],
  [
    { label: '1/x', tex: '\\frac{1}{x}', alt: '1/x', action: 'scientific', value: 'reciprocal', className: 'calc-btn-sci' },
    { label: '|x|', tex: '|x|', alt: '|x|', action: 'scientific', value: 'abs', className: 'calc-btn-sci' },
    { label: 'n√', tex: '\\sqrt[n]{x}', alt: 'n√', action: 'scientific', value: 'nthroot', className: 'calc-btn-sci' },
    { label: 'xʸ', tex: 'x^y', alt: 'xʸ', action: 'scientific', value: 'pow', className: 'calc-btn-sci' },
  ],
  [
    { label: 'logₙ', tex: '\\log_n', alt: 'logₙ', labelKey: 'calculator.functions.logn', action: 'scientific', value: 'logn', className: 'calc-btn-sci' },
    { label: 'a⁄b', tex: '\\frac{a}{b}', alt: 'a⁄b', labelKey: 'calculator.functions.fraction', action: 'scientific', value: 'fraction', className: 'calc-btn-sci' },
    { label: 'Σ', tex: '\\sum', alt: 'Σ', labelKey: 'calculator.functions.sum', action: 'scientific', value: 'sum', className: 'calc-btn-sci' },
    { label: '∫', tex: '\\int', alt: '∫', labelKey: 'calculator.functions.integral', action: 'scientific', value: 'integral', className: 'calc-btn-sci' },
  ],
  [
    { label: 'd/dx', tex: '\\frac{d}{dx}', alt: 'd/dx', labelKey: 'calculator.functions.derivative', action: 'scientific', value: 'derivative', className: 'calc-btn-sci' },
    { label: 'x', tex: 'x', alt: 'x', labelKey: 'calculator.functions.variable', action: 'scientific', value: 'variable', className: 'calc-btn-sci' },
  ],
];
