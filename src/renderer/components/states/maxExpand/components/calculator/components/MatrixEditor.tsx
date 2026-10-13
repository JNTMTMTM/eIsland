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
 * @file MatrixEditor.tsx
 * @description 括号矩阵网格、行列选择以及整矩阵文本粘贴。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { readMatrixDraft, resizeMatrixDraft, type MatrixDraft } from '../utils/matrixEditorUtils';
import { MatrixCell } from './MatrixCell';

const DIMENSIONS = [1, 2, 3, 4, 5, 6];

/** 显示可直接编辑的矩阵，并为历史文本和批量粘贴保留兼容入口。
 * @param props - 矩阵名称、内容、更新及导入错误回调
 * @returns 矩阵操作数卡片
 */
export function MatrixEditor({ name, value, onChange, onImportError }: {
  name: 'A' | 'B'; value: MatrixDraft; onChange: (value: MatrixDraft) => void; onImportError: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const label = t(name === 'A' ? 'calculator.matrix.a' : 'calculator.matrix.b');
  return <section className="calc-workbench-card calc-matrix-operand" aria-label={label} onPasteCapture={(event) => {
    const text = event.clipboardData.getData('text/plain');
    if (!/[\n\t;]/.test(text) && !text.trim().startsWith('[') && !(text.includes(',') && !text.includes('('))) return;
    event.preventDefault(); event.stopPropagation();
    try { onChange(readMatrixDraft(text)); } catch { onImportError(); }
  }}>
    <div className="calc-matrix-heading">
      <strong className="calc-matrix-name">{name}</strong>
      <div className="calc-matrix-dimensions">
        <select aria-label={t('calculator.matrix.rows', { name })} value={value.length}
          onChange={(event) => onChange(resizeMatrixDraft(value, Number(event.target.value), value[0].length))}>
          {DIMENSIONS.map((size) => <option key={size} value={size}>{size}</option>)}
        </select><span aria-hidden="true">×</span>
        <select aria-label={t('calculator.matrix.columns', { name })} value={value[0].length}
          onChange={(event) => onChange(resizeMatrixDraft(value, value.length, Number(event.target.value)))}>
          {DIMENSIONS.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
    </div>
    <div className="calc-matrix-brackets">
      <div className="calc-matrix-grid" style={{ '--matrix-columns': value[0].length } as CSSProperties}>
        {value.flatMap((row, i) => row.map((cell, j) => <MatrixCell key={i + ':' + j} value={cell}
          label={t('calculator.matrix.cell', { name, row: i + 1, column: j + 1 })}
          onChange={(text) => onChange(value.map((original, rowIndex) => rowIndex === i ? original.map((entry, columnIndex) => columnIndex === j ? text : entry) : [...original]))} />))}
      </div>
    </div>
  </section>;
}
