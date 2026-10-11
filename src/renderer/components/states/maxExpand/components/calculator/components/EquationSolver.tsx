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
 * @file EquationSolver.tsx
 * @description 单变量方程求解界面。
 * @author 鸡哥
 */


import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { solveEquation, type EquationResult } from '../utils/equationUtils';
import { getCalculatorErrorCode } from '../utils/calculatorErrorUtils';
import { formatDisplay } from '../utils/calculatorUtils';
import type { CalcAngleUnit } from '../types/calculatorTypes';
import type { CalculatorHistoryFields, CalculatorHistoryInput } from '../utils/historyUtils';

/** 渲染单变量方程求解，明确区分解析解和区间数值近似。
 * @param props - 历史恢复输入和成功求解记录回调
 * @returns 方程求解面板
 */
export function EquationSolver({ initial, onRecord }: {
  initial?: CalculatorHistoryFields<'equation'>; onRecord?: (entry: CalculatorHistoryInput) => void;
} = {}): ReactElement {
  const { t } = useTranslation();
  const [equation, setEquation] = useState(initial?.equation ?? 'x^2=4'); const [lower, setLower] = useState(initial?.lower ?? '-10'); const [upper, setUpper] = useState(initial?.upper ?? '10');
  const [unit, setUnit] = useState<CalcAngleUnit>(initial?.angleUnit ?? 'degree');
  const [result, setResult] = useState<EquationResult | null>(null); const [error, setError] = useState('');
  const reset = (): void => { setResult(null); setError(''); };
  const resultText = (value: EquationResult): string => value.status === 'infinite'
    ? t(value.approximate ? 'calculator.equation.sampledIdentity' : 'calculator.equation.infinite')
    : value.status === 'none' ? t(value.approximate ? 'calculator.equation.noneInRange' : 'calculator.equation.none')
      : 'x ' + (value.approximate ? '≈ ' : '= ') + value.roots.map(formatDisplay).join(', ');
  return <section className="calc-feature-panel">
    <h3>{t('calculator.equation.title')}</h3>
    <label>{t('calculator.equation.expression')}<input value={equation} onChange={(event) => { setEquation(event.target.value); reset(); }} /></label>
    <div className="calc-feature-grid">
      <label>{t('calculator.equation.lower')}<input inputMode="decimal" value={lower} onChange={(event) => { setLower(event.target.value); reset(); }} /></label>
      <label>{t('calculator.equation.upper')}<input inputMode="decimal" value={upper} onChange={(event) => { setUpper(event.target.value); reset(); }} /></label>
    </div>
    <label>{t('calculator.angleUnit.label')}<select value={unit} onChange={(event) => { setUnit(event.target.value as CalcAngleUnit); reset(); }}><option value="degree">{t('calculator.angleUnit.degree')}</option><option value="radian">{t('calculator.angleUnit.radian')}</option></select></label>
    <button className="calc-tool-btn" type="button" onClick={() => {
      try {
        const next = solveEquation(equation, lower.trim() ? Number(lower) : NaN, upper.trim() ? Number(upper) : NaN, unit);
        setResult(next); setError('');
        onRecord?.({ mode: 'equation', formula: equation, result: resultText(next), input: { equation, lower, upper, angleUnit: unit } });
      }
      catch (failure) { setResult(null); setError(t(`calculator.errors.${getCalculatorErrorCode(failure)}`)); }
    }}>{t('calculator.equation.solve')}</button>
    <p>{t('calculator.equation.hint')}</p>
    <output className="calc-feature-result" aria-live="polite">
      {error || (result ? resultText(result) : '—')}
    </output>
  </section>;
}
