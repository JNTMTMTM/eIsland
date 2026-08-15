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
import type { CalcState, CalcButtonDef } from '../types/calculatorTypes';

/** 计算器初始状态 */
export const INITIAL_STATE: CalcState = {
  display: '0',
  operand: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
};

/** 按钮布局定义（5×4 网格） */
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
