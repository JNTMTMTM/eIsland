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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file MatrixCalculator.tsx
 * @description 可视化矩阵编辑、完整矩阵运算和括号结果渲染。
 * @author 鸡哥
 */

import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMatrix, type Matrix, type MatrixOperation } from '../utils/matrixUtils';
import { evaluateFormula, formatDisplay } from '../utils/calculatorUtils';
import { getCalculatorErrorCode } from '../utils/calculatorErrorUtils';
import { evaluateMatrixDraft, readMatrixDraft, serializeMatrixDraft, type MatrixDraft } from '../utils/matrixEditorUtils';
import { MatrixEditor } from './MatrixEditor';
import type { CalculatorHistoryFields, CalculatorHistoryInput } from '../utils/historyUtils';

const OPERATIONS: Record<MatrixOperation, string> = { add: 'calculator.matrix.add', subtract: 'calculator.matrix.subtract', multiply: 'calculator.matrix.multiply', scale: 'calculator.matrix.scale', transpose: 'calculator.matrix.transpose', determinant: 'calculator.matrix.determinant', inverse: 'calculator.matrix.inverse', rank: 'calculator.matrix.rank', solve: 'calculator.matrix.solve' };
function restore(text: string, fallback: string): MatrixDraft { try { return readMatrixDraft(text); } catch { return readMatrixDraft(fallback); } }

/** 渲染可编辑矩阵和矩阵结果，兼容之前的历史文本格式。
 * @param props - 历史恢复输入和成功计算回调
 * @returns 矩阵工作区
 */
export function MatrixCalculator({ initial, onRecord }: {
  initial?: CalculatorHistoryFields<'matrix'>; onRecord?: (entry: CalculatorHistoryInput) => void;
} = {}): ReactElement {
  const { t } = useTranslation();
  const [a, setA] = useState(() => restore(initial?.a ?? '1 2\n3 4', '1 2\n3 4'));
  const [b, setB] = useState(() => restore(initial?.b ?? '1 0\n0 1', '1 0\n0 1'));
  const [scalar, setScalar] = useState(initial?.scalar ?? '2');
  const [operation, setOperation] = useState<MatrixOperation>(initial?.operation ?? 'multiply');
  const [result, setResult] = useState<Matrix | number | null>(null);
  const [error, setError] = useState(() => {
    try { if (initial) { readMatrixDraft(initial.a); readMatrixDraft(initial.b); } return ''; }
    catch { return t('calculator.matrix.invalid'); }
  });
  const binary = ['add', 'subtract', 'multiply', 'solve'].includes(operation);
  const reset = (): void => { setResult(null); setError(''); };
  const matrixText = (matrix: Matrix): string => matrix.map((row) => row.map(formatDisplay).join('\t')).join('\n');
  const resultText = result === null ? '' : typeof result === 'number' ? formatDisplay(result) : matrixText(result);
  const calculate = (): void => {
    try {
      const next = calculateMatrix(operation, evaluateMatrixDraft(a), binary ? evaluateMatrixDraft(b) : undefined, operation === 'scale' ? evaluateFormula(scalar) : 1);
      setResult(next); setError('');
      onRecord?.({ mode: 'matrix', formula: t(OPERATIONS[operation]) + '\nA = ' + a.map((row) => row.join(' ')).join('\n')
        + (binary ? '\nB = ' + b.map((row) => row.join(' ')).join('\n') : operation === 'scale' ? '\nk = ' + scalar : ''),
        result: typeof next === 'number' ? formatDisplay(next) : matrixText(next),
        input: { a: serializeMatrixDraft(a), b: serializeMatrixDraft(b), scalar, operation } });
    } catch (failure) {
      setResult(null); const message = failure instanceof Error ? failure.message : '';
      setError(t(message === 'Singular matrix' ? 'calculator.matrix.singular' : message === 'Matrix dimensions' ? 'calculator.matrix.dimensions'
        : message === 'Invalid matrix' || failure instanceof SyntaxError ? 'calculator.matrix.invalid' : `calculator.errors.${getCalculatorErrorCode(failure)}`));
    }
  };
  return <section className="calc-feature-panel calc-workbench calc-matrix-workbench">
    <header className="calc-workbench-heading">
      <h3>{t('calculator.matrix.title')}</h3>
      <label className="calc-matrix-operation">{t('calculator.matrix.operation')}
        <select value={operation} onChange={(event) => { setOperation(event.target.value as MatrixOperation); reset(); }}>
          {(Object.keys(OPERATIONS) as MatrixOperation[]).map((item) => <option key={item} value={item}>{t(OPERATIONS[item])}</option>)}
        </select>
      </label>
    </header>
    <div className="calc-workbench-layout">
      <div className="calc-matrix-input-area">
        <div className={'calc-matrix-inputs' + (binary ? ' calc-matrix-inputs-pair' : '')}>
          <MatrixEditor name="A" value={a} onChange={(value) => { setA(value); reset(); }} onImportError={() => setError(t('calculator.matrix.invalid'))} />
          {binary && <MatrixEditor name="B" value={b} onChange={(value) => { setB(value); reset(); }} onImportError={() => setError(t('calculator.matrix.invalid'))} />}
        </div>
        {operation === 'scale' && <label>{t('calculator.matrix.scalar')}<input value={scalar} onChange={(event) => { setScalar(event.target.value); reset(); }} /></label>}
        <div className="calc-matrix-actions">
          <button className="calc-primary-action" type="button" onClick={calculate}>{t('calculator.matrix.calculate')}</button>
          {binary && <button className="calc-tool-btn" type="button" onClick={() => { setA(b); setB(a); reset(); }}>{t('calculator.matrix.swap')}</button>}
        </div>
      </div>
      <section className="calc-workbench-card calc-workbench-result">
        <div className="calc-workbench-result-heading"><span>{t('calculator.workbench.result')}</span>
          <button className="calc-tool-btn" type="button" disabled={result === null} onClick={() => void window.api.clipboardWriteText(resultText)
            .then((saved) => { if (!saved) setError(t('calculator.clipboard.failed')); }).catch(() => setError(t('calculator.clipboard.failed')))}>
            {t('calculator.clipboard.copyResult')}</button>
        </div>
        <div className={'calc-feature-result' + (error ? ' calc-workbench-error' : '')} role="status">
          {error || (result === null ? '' : typeof result === 'number' ? formatDisplay(result) : <div className="calc-matrix-brackets calc-matrix-readonly">
            <table className="calc-matrix-result" aria-label={t('calculator.matrix.result')}><tbody>{result.map((row, i) => <tr key={i}>
              {row.map((value, j) => <td key={j} title={formatDisplay(value)}>{formatDisplay(value)}</td>)}
            </tr>)}</tbody></table>
          </div>)}
        </div>
      </section>
    </div>
  </section>;
}
