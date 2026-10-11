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
 * @file calculatorErrorUtils.ts
 * @description 计算器解析和数值错误的用户提示映射。
 * @author 鸡哥
 */

export type CalculatorErrorCode = 'divisionByZero' | 'domain' | 'incomplete' | 'syntax' | 'unboundVariable' | 'unknownFunction' | 'range' | 'convergence' | 'overflow' | 'invalid';

/** 将求值错误转换为可翻译的用户提示标识。
 * @param error - 解析或计算时捕获的错误
 * @returns 精确错误类型
 */
export function getCalculatorErrorCode(error: unknown): CalculatorErrorCode {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Division by zero') return 'divisionByZero';
  if (message.startsWith('Invalid domain') || message.startsWith('Invalid logarithm') || message === 'Invalid factorial') return 'domain';
  if (message === 'Expected value' || message === 'Missing token') return 'incomplete';
  if (message === 'Unexpected token') return 'syntax';
  if (message === 'Unbound variable') return 'unboundVariable';
  if (message === 'Unknown function') return 'unknownFunction';
  if (message.includes('range') || message.includes('arguments')) return 'range';
  if (message.includes('converge')) return 'convergence';
  if (message === 'Non-finite result') return 'overflow';
  return 'invalid';
}
