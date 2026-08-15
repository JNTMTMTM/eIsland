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
 * @description 计算器核心逻辑 hook — 状态机驱动，支持四则运算，可拓展科学函数
 * @author 鸡哥
 */

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';

/** 运算符类型 */
export type CalcOperator = '+' | '-' | '×' | '÷';

/** 计算器状态 */
interface CalcState {
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
  /** 当前显示值（供外部读取） */
  currentValue: number;
}

/** 初始状态 */
const INITIAL_STATE: CalcState = {
  display: '0',
  operand: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
};

/**
 * 格式化数值为显示字符串。
 * 去除尾部多余小数点，限制最大显示位数。
 * @param value - 数值
 * @returns 格式化后的字符串
 */
function formatDisplay(value: number): string {
  if (!isFinite(value)) return 'Error';
  const str = String(value);
  // 限制最大 12 位有效数字，避免溢出显示区
  if (str.replace(/[^0-9]/g, '').length > 12) {
    return value.toPrecision(12).replace(/\.?0+$/, '');
  }
  return str;
}

/**
 * 执行二元运算。
 * @param left - 左操作数
 * @param right - 右操作数
 * @param op - 运算符
 * @returns 运算结果
 */
function evaluate(left: number, right: number, op: CalcOperator): number {
  switch (op) {
    case '+': return left + right;
    case '-': return left - right;
    case '×': return left * right;
    case '÷': return right === 0 ? NaN : left / right;
  }
}

/**
 * 计算器核心逻辑 hook。
 * 使用状态机模式管理计算流程，运算符与计算逻辑解耦，
 * 便于后续拓展科学函数（如 sin/cos/√ 等）。
 */
export function useCalculator(): UseCalculatorReturn {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);

  /** 输入数字（0-9） */
  const inputDigit = useCallback((digit: string): void => {
    setState((prev) => {
      if (prev.waitingForOperand) {
        return { ...prev, display: digit, waitingForOperand: false };
      }
      // 防止前导零（但保留 "0." 的情况）
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

      // 如果已有运算符且未处于等待状态，先计算中间结果
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
    currentValue: parseFloat(state.display),
  };
}
