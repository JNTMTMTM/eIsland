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

/** 渲染复数表达式输入、代数结果和极坐标信息。
 * @returns 复数计算面板
 */
export function ComplexCalculator(): ReactElement {
  const { t } = useTranslation(); const [formula, setFormula] = useState('(1+2i)*(3-4i)');
  const [result, setResult] = useState<ComplexNumber | null>(null); const [error, setError] = useState('');
  return <section className="calc-feature-panel">
    <h3>{t('calculator.complex.title')}</h3>
    <label>{t('calculator.complex.expression')}<input value={formula} onChange={(event) => { setFormula(event.target.value); setResult(null); setError(''); }} /></label>
    <div className="calc-tools">
      <button className="calc-tool-btn" type="button" onClick={() => {
        try { setResult(evaluateComplexFormula(formula)); setError(''); }
        catch (failure) { setResult(null); setError(t(`calculator.errors.${getCalculatorErrorCode(failure)}`)); }
      }}>{t('calculator.complex.calculate')}</button>
      <button className="calc-tool-btn" type="button" disabled={!result} onClick={() => {
        if (result) void window.api.clipboardWriteText(formatComplex(result)).then((saved) => { if (!saved) setError(t('calculator.clipboard.failed')); }).catch(() => setError(t('calculator.clipboard.failed')));
      }}>{t('calculator.clipboard.copyResult')}</button>
    </div>
    <p>{t('calculator.complex.hint')}</p>
    <output className="calc-feature-result" aria-live="polite">{error || (result ? formatComplex(result) : '—')}</output>
    {result && <div className="calc-feature-grid">
      <div>{t('calculator.complex.modulus')}: {formatDisplay(Math.hypot(result.re, result.im))}</div>
      <div>{t('calculator.complex.argument')}: {result.re === 0 && result.im === 0 ? '—' : formatDisplay(Math.atan2(result.im, result.re))}</div>
      <div>{t('calculator.complex.conjugate')}: {formatComplex({ re: result.re, im: -result.im })}</div>
      <div>{t('calculator.complex.polar')}: {formatDisplay(Math.hypot(result.re, result.im))} ∠ {result.re === 0 && result.im === 0 ? '—' : formatDisplay(Math.atan2(result.im, result.re))}</div>
    </div>}
  </section>;
}
