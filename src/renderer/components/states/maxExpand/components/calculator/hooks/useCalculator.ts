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
 * @description 结构化计算器公式编辑状态，所有输入仅修改公式，等号触发求值。
 * @author 鸡哥
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  CalcAngleUnit,
  CalcOperator,
  CalcState,
  FormulaCursor,
  FormulaDocument,
  FormulaStructureKind,
  ScientificFn,
  UseCalculatorReturn,
} from '../types/calculatorTypes';
import { INITIAL_STATE } from '../config/calculatorConfig';
import { evaluateFormula, formatDisplay, getScientificInput } from '../utils/calculatorUtils';
import {
  createInitialFormula,
  deleteFormulaContent,
  insertFormulaStructure,
  insertFormulaText,
  moveFormulaCursor,
  moveFormulaCursorBoundary,
  serializeFormulaDocument,
} from '../utils/formulaDocumentUtils';

const STRUCTURE_KIND: Partial<Record<ScientificFn, FormulaStructureKind>> = {
  logn: 'logn',
  fraction: 'fraction',
  sum: 'sum',
  integral: 'integral',
  derivative: 'derivative',
  sqrt: 'sqrt',
  nthroot: 'root',
};

function evaluateResult(document: FormulaDocument, angleUnit: CalcAngleUnit): string {
  try {
    return formatDisplay(evaluateFormula(serializeFormulaDocument(document), angleUnit));
  } catch {
    return 'Error';
  }
}

/**
 * 管理结构化公式、槽位光标和最终求值。
 * @returns 计算器编辑状态与操作方法
 */
export function useCalculator(): UseCalculatorReturn {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);
  const [angleUnit, setAngleUnitState] = useState<CalcAngleUnit>('degree');

  const setAngleUnit = useCallback((unit: CalcAngleUnit): void => {
    if (unit === angleUnit) return;
    setAngleUnitState(unit);
    // 切换单位时同步已有结果，避免新单位旁仍显示旧单位的计算值。
    setState((previous) => previous.result === null ? previous : {
      ...previous,
      result: evaluateResult(previous.document, unit),
    });
  }, [angleUnit]);

  const insertText = useCallback((text: string, replaceInitial = true, cursorOffset = 0): void => {
    setState((previous) => ({
      ...insertFormulaText(previous.document, previous.cursor, text, replaceInitial, cursorOffset),
      result: null,
    }));
  }, []);

  const inputText = useCallback((text: string): void => insertText(text), [insertText]);
  const inputDigit = useCallback((digit: string): void => insertText(digit), [insertText]);
  const inputDot = useCallback((): void => insertText('.'), [insertText]);
  const inputOperator = useCallback((operator: CalcOperator): void => insertText(operator, false), [insertText]);

  const calculate = useCallback((): void => {
    setState((previous) => ({ ...previous, result: evaluateResult(previous.document, angleUnit) }));
  }, [angleUnit]);

  const clear = useCallback((): void => {
    const initial = createInitialFormula();
    setState({ ...initial, result: null });
  }, []);

  const backspace = useCallback((): void => {
    setState((previous) => ({
      ...deleteFormulaContent(previous.document, previous.cursor, -1),
      result: null,
    }));
  }, []);

  const deleteForward = useCallback((): void => {
    setState((previous) => ({
      ...deleteFormulaContent(previous.document, previous.cursor, 1),
      result: null,
    }));
  }, []);

  const moveCursor = useCallback((cursor: FormulaCursor): void => {
    setState((previous) => ({ ...previous, cursor }));
  }, []);

  const moveCursorHorizontal = useCallback((direction: -1 | 1): void => {
    setState((previous) => ({
      ...previous,
      cursor: moveFormulaCursor(previous.document, previous.cursor, direction),
    }));
  }, []);

  const moveCursorBoundary = useCallback((boundary: 'start' | 'end'): void => {
    setState((previous) => ({
      ...previous,
      cursor: moveFormulaCursorBoundary(previous.document, boundary),
    }));
  }, []);

  const toggleSign = useCallback((): void => insertText('-'), [insertText]);
  const percentage = useCallback((): void => insertText('%', false), [insertText]);

  const applyScientific = useCallback((fn: ScientificFn): void => {
    const structureKind = STRUCTURE_KIND[fn];
    if (structureKind) {
      setState((previous) => ({
        ...insertFormulaStructure(previous.document, previous.cursor, structureKind),
        result: null,
      }));
      return;
    }

    const input = getScientificInput(fn);
    const preserveInitial = fn === 'square' || fn === 'cube' || fn === 'pow' || fn === 'factorial';
    insertText(input.text, !preserveInitial, input.cursorOffset);
  }, [insertText]);

  const formula = useMemo(() => serializeFormulaDocument(state.document), [state.document]);
  const currentValue = state.result === null ? Number.NaN : Number(state.result);

  return {
    document: state.document,
    formula,
    result: state.result,
    cursor: state.cursor,
    angleUnit,
    setAngleUnit,
    inputDigit,
    inputDot,
    inputOperator,
    inputText,
    calculate,
    clear,
    backspace,
    deleteForward,
    moveCursor,
    moveCursorHorizontal,
    moveCursorBoundary,
    toggleSign,
    percentage,
    applyScientific,
    currentValue,
  };
}
