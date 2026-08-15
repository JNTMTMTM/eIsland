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
 * @description 计算器模块类型定义
 * @author 鸡哥
 */

/** 运算符类型 */
export type CalcOperator = '+' | '-' | '×' | '÷';

/** 按钮动作类型 */
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

/** 科学函数类型 */
export type ScientificFn =
  | 'sin' | 'cos' | 'tan'
  | 'asin' | 'acos' | 'atan'
  | 'log' | 'ln'
  | 'sqrt' | 'cbrt' | 'nthroot'
  | 'square' | 'cube' | 'reciprocal'
  | 'factorial' | 'abs'
  | 'pi' | 'e'
  | 'pow' | 'exp';

/** 计算器内部状态 */
export interface CalcState {
  /** 当前显示值 */
  display: string;
  /** 已输入的操作数（左侧） */
  operand: string | null;
  /** 当前运算符 */
  operator: CalcOperator | null;
  /** 是否等待下一个操作数输入 */
  waitingForOperand: boolean;
  /** 表达式预览（如 "3 +"） */
  expression: string;
}

/** 计算器 hook 返回接口 */
export interface UseCalculatorReturn {
  /** 当前显示值 */
  display: string;
  /** 表达式预览 */
  expression: string;
  /** 输入数字 */
  inputDigit: (digit: string) => void;
  /** 输入小数点 */
  inputDot: () => void;
  /** 设置运算符 */
  setOperator: (op: CalcOperator) => void;
  /** 执行计算 */
  calculate: () => void;
  /** 清除全部 */
  clear: () => void;
  /** 退格 */
  backspace: () => void;
  /** 正负切换 */
  toggleSign: () => void;
  /** 百分比 */
  percentage: () => void;
  /** 执行科学函数 */
  applyScientific: (fn: ScientificFn) => void;
  /** 当前数值（供外部读取） */
  currentValue: number;
}

/** 按钮配置项 */
export interface CalcButtonDef {
  /** 文本标签（数字、.、= 等无图标的按钮） */
  label?: string;
  /** SVG 图标路径（有图标的按钮） */
  icon?: string;
  /** 图标 alt 文本 / 按钮唯一标识 */
  alt: string;
  /** 按钮动作类型 */
  action: CalcButtonAction;
  /** 传递给动作的值（数字或运算符） */
  value?: string;
  /** 额外 CSS 类名 */
  className?: string;
}

/** 计算器模式 */
export type CalcMode = 'arithmetic' | 'scientific' | 'coordinate' | 'unitConversion';

/** 侧边栏导航项配置 */
export interface CalcSidebarNavItem {
  /** 模式标识 */
  mode: CalcMode;
  /** 图标路径 */
  icon: string;
  /** i18n 翻译键 */
  labelKey: string;
  /** 默认标签（i18n 未加载时的兜底） */
  defaultLabel: string;
}
