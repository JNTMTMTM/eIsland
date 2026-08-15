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
 * @description 计算器公式编辑状态，所有输入先写入公式，仅等号触发求值。
 * @author 鸡哥
 */

import { useCallback, useState } from 'react';
import type { CalcOperator, CalcState, ScientificFn, UseCalculatorReturn } from '../types/calculatorTypes';
import { INITIAL_STATE } from '../config/calculatorConfig';
import { evaluateFormula, formatDisplay, getScientificInput } from '../utils/calculatorUtils';

function insertAtCursor(state: CalcState, text: string, cursorOffset = 0, preserveInitial = false): CalcState {
  const formula = !preserveInitial && state.formula === '0' && state.cursor === 1 ? '' : state.formula;
  const cursor = formula === '' ? 0 : state.cursor;
  const nextFormula = `${formula.slice(0, cursor)}${text}${formula.slice(cursor)}`;
  return {
    formula: nextFormula || '0',
    result: null,
    cursor: cursor + text.length - cursorOffset,
  };
}

/**
 * 管理公式字符串、编辑光标和最终求值。
 * @returns 计算器编辑状态与操作方法
 */
export function useCalculator(): UseCalculatorReturn {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);

  const inputText = useCallback((text: string): void => {
    setState((previous) => insertAtCursor(previous, text));
  }, []);

  const inputDigit = useCallback((digit: string): void => {
    setState((previous) => insertAtCursor(previous, digit));
  }, []);

  const inputDot = useCallback((): void => {
    setState((previous) => insertAtCursor(previous, '.'));
  }, []);

  const inputOperator = useCallback((operator: CalcOperator): void => {
    setState((previous) => insertAtCursor(previous, operator, 0, true));
  }, []);

  const calculate = useCallback((): void => {
    setState((previous) => {
      try {
        return { ...previous, result: formatDisplay(evaluateFormula(previous.formula)) };
      } catch {
        return { ...previous, result: 'Error' };
      }
    });
  }, []);

  const clear = useCallback((): void => setState(INITIAL_STATE), []);

  const backspace = useCallback((): void => {
    setState((previous) => {
      if (previous.cursor === 0) return previous;
      const formula = `${previous.formula.slice(0, previous.cursor - 1)}${previous.formula.slice(previous.cursor)}`;
      return {
        formula: formula || '0',
        result: null,
        cursor: formula ? previous.cursor - 1 : 1,
      };
    });
  }, []);

  const deleteForward = useCallback((): void => {
    setState((previous) => {
      if (previous.cursor >= previous.formula.length) return previous;
      const formula = `${previous.formula.slice(0, previous.cursor)}${previous.formula.slice(previous.cursor + 1)}`;
      return {
        formula: formula || '0',
        result: null,
        cursor: formula ? previous.cursor : 1,
      };
    });
  }, []);

  const moveCursor = useCallback((position: number): void => {
    setState((previous) => ({
      ...previous,
      cursor: Math.max(0, Math.min(position, previous.formula.length)),
    }));
  }, []);

  const toggleSign = useCallback((): void => {
    setState((previous) => insertAtCursor(previous, '-'));
  }, []);

  const percentage = useCallback((): void => {
    setState((previous) => insertAtCursor(previous, '%', 0, true));
  }, []);

  const applyScientific = useCallback((fn: ScientificFn): void => {
    const input = getScientificInput(fn);
    const preserveInitial = fn === 'square' || fn === 'cube' || fn === 'pow' || fn === 'factorial';
    setState((previous) => insertAtCursor(previous, input.text, input.cursorOffset, preserveInitial));
  }, []);

  const currentValue = state.result === null ? Number.NaN : Number(state.result);

  return {
    formula: state.formula,
    result: state.result,
    cursor: state.cursor,
    inputDigit,
    inputDot,
    inputOperator,
    inputText,
    calculate,
    clear,
    backspace,
    deleteForward,
    moveCursor,
    toggleSign,
    percentage,
    applyScientific,
    currentValue,
  };
}