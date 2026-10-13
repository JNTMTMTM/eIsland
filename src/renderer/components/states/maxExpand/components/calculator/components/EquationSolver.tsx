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
  const solve = (): void => {
    try {
      const next = solveEquation(equation, lower.trim() ? Number(lower) : NaN, upper.trim() ? Number(upper) : NaN, unit);
      setResult(next); setError('');
      onRecord?.({ mode: 'equation', formula: equation, result: resultText(next), input: { equation, lower, upper, angleUnit: unit } });
    } catch (failure) { setResult(null); setError(t(`calculator.errors.${getCalculatorErrorCode(failure)}`)); }
  };
  return <section className="calc-feature-panel calc-workbench">
    <header className="calc-workbench-heading"><h3>{t('calculator.equation.title')}</h3></header>
    <div className="calc-workbench-layout">
      <form className="calc-workbench-card calc-workbench-form" onSubmit={(event) => { event.preventDefault(); solve(); }}>
        <label>{t('calculator.equation.expression')}
          <input className="calc-workbench-expression" value={equation} spellCheck={false}
            onChange={(event) => { setEquation(event.target.value); reset(); }} />
        </label>
        <div className="calc-workbench-angle" role="group" aria-label={t('calculator.angleUnit.label')}>
          <span>{t('calculator.angleUnit.label')}</span>
          <div className="calc-angle-unit">{(['degree', 'radian'] as const).map((angle) => <button key={angle}
            className="calc-angle-unit-btn" type="button" aria-pressed={unit === angle}
            aria-label={t(angle === 'degree' ? 'calculator.angleUnit.degree' : 'calculator.angleUnit.radian')}
            onClick={() => { setUnit(angle); reset(); }}>
            {t(angle === 'degree' ? 'calculator.angleUnit.degreeShort' : 'calculator.angleUnit.radianShort')}
          </button>)}</div>
        </div>
        <div className="calc-workbench-fields">
          <label>{t('calculator.equation.lower')}<input inputMode="decimal" value={lower} onChange={(event) => { setLower(event.target.value); reset(); }} /></label>
          <label>{t('calculator.equation.upper')}<input inputMode="decimal" value={upper} onChange={(event) => { setUpper(event.target.value); reset(); }} /></label>
        </div>
        <button className="calc-primary-action" type="submit">{t('calculator.equation.solve')}</button>
      </form>
      <section className="calc-workbench-card calc-workbench-result">
        <div className="calc-workbench-result-heading"><span>{t('calculator.workbench.result')}</span>
          {result && <span className="calc-workbench-badge">{t(result.approximate ? 'calculator.workbench.approximate' : 'calculator.workbench.exact')}</span>}
        </div>
        <output className={'calc-feature-result' + (error ? ' calc-workbench-error' : '')} aria-live="polite">
          {error || (result ? resultText(result) : '—')}
        </output>
        {result?.status === 'finite' && <div className="calc-root-list">{result.roots.map((root, index) => <div className="calc-root-card" key={index}>
          <span>x<sub>{index + 1}</sub></span><strong>{formatDisplay(root)}</strong>
        </div>)}</div>}
      </section>
    </div>
  </section>;
}
