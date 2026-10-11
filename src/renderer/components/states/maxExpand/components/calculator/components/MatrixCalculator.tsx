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
 * @file MatrixCalculator.tsx
 * @description 矩阵输入、运算、线性方程组和结果复制界面。
 * @author 鸡哥
 */


import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMatrix, parseMatrix, type Matrix, type MatrixOperation } from '../utils/matrixUtils';
import { evaluateFormula, formatDisplay } from '../utils/calculatorUtils';
import { getCalculatorErrorCode } from '../utils/calculatorErrorUtils';
const OPERATIONS: Record<MatrixOperation, string> = { add: 'calculator.matrix.add', subtract: 'calculator.matrix.subtract', multiply: 'calculator.matrix.multiply', scale: 'calculator.matrix.scale', transpose: 'calculator.matrix.transpose', determinant: 'calculator.matrix.determinant', inverse: 'calculator.matrix.inverse', rank: 'calculator.matrix.rank', solve: 'calculator.matrix.solve' };

/** 渲染矩阵输入、运算选择与矩阵结果。
 * @returns 矩阵计算器
 */
export function MatrixCalculator(): ReactElement {
  const { t } = useTranslation();
  const [a, setA] = useState('1 2\n3 4'); const [b, setB] = useState('1 0\n0 1');
  const [scalar, setScalar] = useState('2'); const [operation, setOperation] = useState<MatrixOperation>('multiply');
  const [result, setResult] = useState<Matrix | number | null>(null); const [error, setError] = useState('');
  const binary = ['add', 'subtract', 'multiply', 'solve'].includes(operation);
  const reset = (): void => { setResult(null); setError(''); };
  const resultText = result === null ? '' : typeof result === 'number' ? formatDisplay(result) : result.map((row) => row.map(formatDisplay).join('\t')).join('\n');
  return <section className="calc-feature-panel">
    <h3>{t('calculator.matrix.title')}</h3>
    <label>{t('calculator.matrix.operation')}<select value={operation} onChange={(event) => { setOperation(event.target.value as MatrixOperation); reset(); }}>{(Object.keys(OPERATIONS) as MatrixOperation[]).map((item) => <option key={item} value={item}>{t(OPERATIONS[item])}</option>)}</select></label>
    <div className="calc-feature-grid">
      <label>{t('calculator.matrix.a')}<textarea rows={4} value={a} onChange={(event) => { setA(event.target.value); reset(); }} /></label>
      {binary && <label>{t('calculator.matrix.b')}<textarea rows={4} value={b} onChange={(event) => { setB(event.target.value); reset(); }} /></label>}
      {operation === 'scale' && <label>{t('calculator.matrix.scalar')}<input value={scalar} onChange={(event) => { setScalar(event.target.value); reset(); }} /></label>}
    </div>
    <div className="calc-tools">
      <button className="calc-tool-btn" type="button" onClick={() => {
        try { setResult(calculateMatrix(operation, parseMatrix(a), binary ? parseMatrix(b) : undefined, operation === 'scale' ? evaluateFormula(scalar) : 1)); setError(''); }
        catch (failure) {
          setResult(null); const message = failure instanceof Error ? failure.message : '';
          setError(t(message === 'Singular matrix' ? 'calculator.matrix.singular' : message === 'Matrix dimensions' ? 'calculator.matrix.dimensions' : message === 'Invalid matrix' || failure instanceof SyntaxError ? 'calculator.matrix.invalid' : `calculator.errors.${getCalculatorErrorCode(failure)}`));
        }
      }}>{t('calculator.matrix.calculate')}</button>
      {binary && <button className="calc-tool-btn" type="button" onClick={() => { setA(b); setB(a); reset(); }}>{t('calculator.matrix.swap')}</button>}
      <button className="calc-tool-btn" type="button" disabled={result === null} onClick={() => void window.api.clipboardWriteText(resultText).then((saved) => { if (!saved) setError(t('calculator.clipboard.failed')); }).catch(() => setError(t('calculator.clipboard.failed')))}>{t('calculator.clipboard.copyResult')}</button>
    </div>
    <p>{t('calculator.matrix.hint')}</p>
    <div className="calc-feature-result" role="status">
      {error || (result === null ? '—' : typeof result === 'number' ? formatDisplay(result) : <table className="calc-matrix-result" aria-label={t('calculator.matrix.result')}><tbody>{result.map((row, i) => <tr key={'row-' + i}>{row.map((value, j) => <td key={'cell-' + j}>{formatDisplay(value)}</td>)}</tr>)}</tbody></table>)}
    </div>
  </section>;
}
