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
 * @file ComplexCalculator.tsx
 * @description 复数表达式、代数形式、极坐标和共轭显示。
 * @author 鸡哥
 */


import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { evaluateComplexFormula, formatComplex, type ComplexNumber } from '../utils/complexUtils';
import { formatDisplay } from '../utils/calculatorUtils';
import { getCalculatorErrorCode } from '../utils/calculatorErrorUtils';
import type { CalculatorHistoryFields, CalculatorHistoryInput } from '../utils/historyUtils';

/** 渲染复数表达式输入、代数结果和极坐标信息。
 * @param props - 历史恢复输入和成功计算记录回调
 * @returns 复数计算面板
 */
export function ComplexCalculator({ initial, onRecord }: {
  initial?: CalculatorHistoryFields<'complex'>; onRecord?: (entry: CalculatorHistoryInput) => void;
} = {}): ReactElement {
  const { t } = useTranslation(); const [formula, setFormula] = useState(initial?.formula ?? '(1+2i)*(3-4i)');
  const [result, setResult] = useState<ComplexNumber | null>(null); const [error, setError] = useState('');
  const calculate = (): void => {
    try {
      const next = evaluateComplexFormula(formula); setResult(next); setError('');
      onRecord?.({ mode: 'complex', formula, result: formatComplex(next), input: { formula } });
    } catch (failure) { setResult(null); setError(t(`calculator.errors.${getCalculatorErrorCode(failure)}`)); }
  };
  return <section className="calc-feature-panel calc-workbench">
    <header className="calc-workbench-heading"><h3>{t('calculator.complex.title')}</h3></header>
    <div className="calc-workbench-layout">
      <form className="calc-workbench-card calc-workbench-form" onSubmit={(event) => { event.preventDefault(); calculate(); }}>
        <label>{t('calculator.complex.expression')}
          <input className="calc-workbench-expression" value={formula} spellCheck={false}
            onChange={(event) => { setFormula(event.target.value); setResult(null); setError(''); }} />
        </label>
        <button className="calc-primary-action" type="submit">{t('calculator.complex.calculate')}</button>
      </form>
      <section className="calc-workbench-card calc-workbench-result">
        <div className="calc-workbench-result-heading"><span>{t('calculator.workbench.result')}</span>
          <button className="calc-tool-btn" type="button" disabled={!result} onClick={() => {
            if (result) void window.api.clipboardWriteText(formatComplex(result)).then((saved) => { if (!saved) setError(t('calculator.clipboard.failed')); }).catch(() => setError(t('calculator.clipboard.failed')));
          }}>{t('calculator.clipboard.copyResult')}</button>
        </div>
        <output className={'calc-feature-result' + (error ? ' calc-workbench-error' : '')} aria-live="polite">
          {error || (result ? formatComplex(result) : '—')}
        </output>
        {result && <dl className="calc-complex-details">
          <div><dt>{t('calculator.complex.modulus')}</dt><dd>{formatDisplay(Math.hypot(result.re, result.im))}</dd></div>
          <div><dt>{t('calculator.complex.argument')}</dt><dd>{result.re === 0 && result.im === 0 ? '—' : formatDisplay(Math.atan2(result.im, result.re))}</dd></div>
          <div><dt>{t('calculator.complex.conjugate')}</dt><dd>{formatComplex({ re: result.re, im: -result.im })}</dd></div>
          <div><dt>{t('calculator.complex.polar')}</dt><dd>{formatDisplay(Math.hypot(result.re, result.im))} ∠ {result.re === 0 && result.im === 0 ? '—' : formatDisplay(Math.atan2(result.im, result.re))}</dd></div>
        </dl>}
      </section>
    </div>
  </section>;
}
