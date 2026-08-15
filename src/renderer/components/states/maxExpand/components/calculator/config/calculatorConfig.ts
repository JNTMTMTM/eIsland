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
import type { CalcState, CalcButtonDef, CalcSidebarNavItem } from '../types/calculatorTypes';

/** 计算器初始状态 */
export const INITIAL_STATE: CalcState = {
  formula: '0',
  result: null,
  cursor: 1,
};

/** 侧边栏导航项 */
export const CALC_SIDEBAR_NAV_ITEMS: CalcSidebarNavItem[] = [
  { mode: 'arithmetic', icon: CalculatorIcon.ARITHMETIC, labelKey: 'calculator.modes.arithmetic', defaultLabel: '四则运算' },
  { mode: 'scientific', icon: CalculatorIcon.SCIENTIFIC, labelKey: 'calculator.modes.scientific', defaultLabel: '科学计算' },
  { mode: 'coordinate', icon: CalculatorIcon.COORDINATE, labelKey: 'calculator.modes.coordinate', defaultLabel: '绘图' },
  { mode: 'unitConversion', icon: CalculatorIcon.UNIT_CONVERSION, labelKey: 'calculator.modes.unitConversion', defaultLabel: '单位换算' },
];

/** 四则运算按钮布局（5×4 网格） */
export const BUTTON_LAYOUT: CalcButtonDef[][] = [
  [
    { icon: CalculatorIcon.CLEAR, alt: 'C', action: 'clear', className: 'calc-btn--func' },
    { icon: CalculatorIcon.PLUS_MINUS, alt: '±', action: 'toggleSign', className: 'calc-btn--func' },
    { icon: CalculatorIcon.PERCENTAGE, alt: '%', action: 'percentage', className: 'calc-btn--func' },
    { icon: CalculatorIcon.DIVISION, alt: '÷', action: 'operator', value: '÷', className: 'calc-btn--op' },
  ],
  [
    { label: '7', alt: '7', action: 'digit', value: '7' },
    { label: '8', alt: '8', action: 'digit', value: '8' },
    { label: '9', alt: '9', action: 'digit', value: '9' },
    { icon: CalculatorIcon.MULTIPLICATION, alt: '×', action: 'operator', value: '×', className: 'calc-btn--op' },
  ],
  [
    { label: '4', alt: '4', action: 'digit', value: '4' },
    { label: '5', alt: '5', action: 'digit', value: '5' },
    { label: '6', alt: '6', action: 'digit', value: '6' },
    { icon: CalculatorIcon.MINUS, alt: '-', action: 'operator', value: '-', className: 'calc-btn--op' },
  ],
  [
    { label: '1', alt: '1', action: 'digit', value: '1' },
    { label: '2', alt: '2', action: 'digit', value: '2' },
    { label: '3', alt: '3', action: 'digit', value: '3' },
    { icon: CalculatorIcon.PLUS, alt: '+', action: 'operator', value: '+', className: 'calc-btn--op' },
  ],
  [
    { label: '0', alt: '0', action: 'digit', value: '0', className: 'calc-btn--zero' },
    { label: '.', alt: '.', action: 'dot' },
    { icon: CalculatorIcon.BACKSPACE, alt: '⌫', action: 'backspace' },
    { label: '=', alt: '=', action: 'equals', className: 'calc-btn--equals' },
  ],
];

/** 科学函数按钮布局（5×4 网格，仅科学函数，与四则运算左右并排） */
export const SCIENTIFIC_FN_LAYOUT: CalcButtonDef[][] = [
  [
    { label: 'sin', alt: 'sin', action: 'scientific', value: 'sin', className: 'calc-btn--sci' },
    { label: 'cos', alt: 'cos', action: 'scientific', value: 'cos', className: 'calc-btn--sci' },
    { label: 'tan', alt: 'tan', action: 'scientific', value: 'tan', className: 'calc-btn--sci' },
    { label: 'π', alt: 'π', action: 'scientific', value: 'pi', className: 'calc-btn--sci' },
  ],
  [
    { label: 'sin⁻¹', alt: 'sin⁻¹', action: 'scientific', value: 'arcsin', className: 'calc-btn--sci' },
    { label: 'cos⁻¹', alt: 'cos⁻¹', action: 'scientific', value: 'arccos', className: 'calc-btn--sci' },
    { label: 'tan⁻¹', alt: 'tan⁻¹', action: 'scientific', value: 'arctan', className: 'calc-btn--sci' },
    { label: 'e', alt: 'e', action: 'scientific', value: 'e', className: 'calc-btn--sci' },
  ],
  [
    { label: 'x²', alt: 'x²', action: 'scientific', value: 'square', className: 'calc-btn--sci' },
    { label: 'x³', alt: 'x³', action: 'scientific', value: 'cube', className: 'calc-btn--sci' },
    { label: 'x!', alt: 'x!', action: 'scientific', value: 'factorial', className: 'calc-btn--sci' },
    { label: 'eˣ', alt: 'eˣ', action: 'scientific', value: 'exp', className: 'calc-btn--sci' },
  ],
  [
    { label: '√', alt: '√', action: 'scientific', value: 'sqrt', className: 'calc-btn--sci' },
    { label: '∛', alt: '∛', action: 'scientific', value: 'cbrt', className: 'calc-btn--sci' },
    { label: 'log', alt: 'log', action: 'scientific', value: 'log', className: 'calc-btn--sci' },
    { label: 'ln', alt: 'ln', action: 'scientific', value: 'ln', className: 'calc-btn--sci' },
  ],
  [
    { label: '1/x', alt: '1/x', action: 'scientific', value: 'reciprocal', className: 'calc-btn--sci' },
    { label: '|x|', alt: '|x|', action: 'scientific', value: 'abs', className: 'calc-btn--sci' },
    { label: 'n√', alt: 'n√', action: 'scientific', value: 'nthroot', className: 'calc-btn--sci' },
    { label: 'xʸ', alt: 'xʸ', action: 'scientific', value: 'pow', className: 'calc-btn--sci' },
  ],
];
