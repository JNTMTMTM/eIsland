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
 * @file useCalculator.ts
 * @description 计算器核心逻辑 hook — 状态机驱动，支持四则运算与科学函数
 * @author 鸡哥
 */

import { useState, useCallback } from 'react';
import type { CalcOperator, CalcState, ScientificFn, UseCalculatorReturn } from '../types/calculatorTypes';
import { INITIAL_STATE } from '../config/calculatorConfig';
import { formatDisplay, evaluate, applyScientificFn } from '../utils/calculatorUtils';

/**
 * 计算器核心逻辑 hook。
 * 使用状态机模式管理计算流程，支持四则运算与科学函数。
 * @returns 计算器状态与操作方法
 */
export function useCalculator(): UseCalculatorReturn {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);

  /** 输入数字（0-9） */
  const inputDigit = useCallback((digit: string): void => {
    setState((prev) => {
      if (prev.waitingForOperand) {
        return { ...prev, display: digit, waitingForOperand: false };
      }
      if (prev.display === '0' && digit !== '0') {
        return { ...prev, display: digit };
      }
      if (prev.display === '0' && digit === '0') {
        return prev;
      }
      return { ...prev, display: prev.display + digit };
    });
  }, []);

  /** 输入小数点 */
  const inputDot = useCallback((): void => {
    setState((prev) => {
      if (prev.waitingForOperand) {
        return { ...prev, display: '0.', waitingForOperand: false };
      }
      if (prev.display.includes('.')) return prev;
      return { ...prev, display: prev.display + '.' };
    });
  }, []);

  /** 设置运算符 */
  const setOperator = useCallback((op: CalcOperator): void => {
    setState((prev) => {
      const current = parseFloat(prev.display);
      if (prev.operator && !prev.waitingForOperand && prev.operand !== null) {
        const left = parseFloat(prev.operand);
        const result = evaluate(left, current, prev.operator);
        const resultStr = formatDisplay(result);
        return {
          display: resultStr,
          operand: resultStr,
          operator: op,
          waitingForOperand: true,
          expression: `${resultStr} ${op}`,
        };
      }
      return {
        ...prev,
        operand: prev.display,
        operator: op,
        waitingForOperand: true,
        expression: `${prev.display} ${op}`,
      };
    });
  }, []);

  /** 执行等号计算 */
  const calculate = useCallback((): void => {
    setState((prev) => {
      if (prev.operator === null || prev.operand === null) return prev;
      const left = parseFloat(prev.operand);
      const right = parseFloat(prev.display);
      const result = evaluate(left, right, prev.operator);
      const resultStr = formatDisplay(result);
      return {
        display: resultStr,
        operand: null,
        operator: null,
        waitingForOperand: true,
        expression: '',
      };
    });
  }, []);

  /** 清除全部 */
  const clear = useCallback((): void => {
    setState(INITIAL_STATE);
  }, []);

  /** 退格 */
  const backspace = useCallback((): void => {
    setState((prev) => {
      if (prev.waitingForOperand) return prev;
      if (prev.display.length <= 1 || (prev.display.length === 2 && prev.display[0] === '-')) {
        return { ...prev, display: '0' };
      }
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  }, []);

  /** 正负切换 */
  const toggleSign = useCallback((): void => {
    setState((prev) => {
      if (prev.display === '0') return prev;
      if (prev.display.startsWith('-')) {
        return { ...prev, display: prev.display.slice(1) };
      }
      return { ...prev, display: `-${prev.display}` };
    });
  }, []);

  /** 百分比 */
  const percentage = useCallback((): void => {
    setState((prev) => {
      const current = parseFloat(prev.display);
      return { ...prev, display: formatDisplay(current / 100) };
    });
  }, []);

  /** 执行科学函数 */
  const applyScientific = useCallback((fn: ScientificFn): void => {
    setState((prev) => {
      const current = parseFloat(prev.display);
      const result = applyScientificFn(fn, current);
      const resultStr = formatDisplay(result);
      return {
        ...prev,
        display: resultStr,
        waitingForOperand: true,
      };
    });
  }, []);

  return {
    display: state.display,
    expression: state.expression,
    inputDigit,
    inputDot,
    setOperator,
    calculate,
    clear,
    backspace,
    toggleSign,
    percentage,
    applyScientific,
    currentValue: parseFloat(state.display),
  };
}
