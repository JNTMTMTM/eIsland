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
 * @file MatrixCell.tsx
 * @description 数学矩阵中的直接编辑单元格，保留光标与纯文本粘贴。
 * @author 鸡哥
 */

import { useEffect, useRef, type ReactElement } from 'react';
import { evaluateFormula } from '../utils/calculatorUtils';

/** 将单个矩阵元素显示为可直接编辑的数学内容。
 * @param props - 元素值、可访问名称和更新回调
 * @returns 无边框矩阵单元格
 */
export function MatrixCell({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && (document.activeElement !== ref.current || ref.current.textContent !== value)) ref.current.textContent = value;
  }, [value]);
  let invalid = false;
  try { if (!value.trim()) invalid = true; else evaluateFormula(value); } catch { invalid = true; }
  return <div ref={ref} className="calc-matrix-cell" contentEditable suppressContentEditableWarning
    role="textbox" aria-label={label} aria-multiline="false" aria-invalid={invalid} spellCheck={false} tabIndex={0} title={value}
    onInput={(event) => onChange(event.currentTarget.textContent ?? '')}
    onBlur={(event) => { event.currentTarget.textContent = value; }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const cells = Array.from(event.currentTarget.closest('.calc-matrix-grid')!.querySelectorAll<HTMLElement>('.calc-matrix-cell'));
        cells[(cells.indexOf(event.currentTarget) + 1) % cells.length]?.focus();
      }
    }}
    onPaste={(event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain').replace(/[\r\n]/g, '');
      const selection = window.getSelection();
      if (selection?.rangeCount && event.currentTarget.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0); range.deleteContents();
        const pasted = document.createTextNode(text); range.insertNode(pasted);
        range.setStartAfter(pasted); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
      } else event.currentTarget.textContent = text;
      onChange(event.currentTarget.textContent ?? '');
    }} />;
}
