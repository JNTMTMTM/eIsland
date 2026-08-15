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
 * @file CalcDisplay.tsx
 * @description 计算器结构化公式编辑显示区。
 * @author 鸡哥
 */

import { useEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';
import type { FormulaCursor, FormulaDocument } from '../types/calculatorTypes';
import { FormulaExpression } from './FormulaExpression';

interface CalcDisplayProps {
  document: FormulaDocument;
  result: string | null;
  cursor: FormulaCursor;
  fontSize: string;
  onCursorChange: (cursor: FormulaCursor) => void;
  onMoveEnd: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * 渲染可编辑的结构化计算器公式。
 * @param props - 公式文档、光标位置和编辑回调
 * @returns 公式显示区域
 */
export function CalcDisplay({
  document,
  result,
  cursor,
  fontSize,
  onCursorChange,
  onMoveEnd,
  onKeyDown,
}: CalcDisplayProps): ReactElement {
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    displayRef.current?.focus();
  }, []);

  const handleDisplayClick = (): void => {
    displayRef.current?.focus();
    onMoveEnd();
  };

  return (
    <div
      className="calc-display"
      ref={displayRef}
      role="textbox"
      tabIndex={0}
      aria-multiline="false"
      onClickCapture={handleDisplayClick}
      onKeyDown={onKeyDown}
    >
      <div className="calc-expression" style={{ fontSize }}>
        <FormulaExpression document={document} cursor={cursor} onCursorChange={onCursorChange} />
      </div>
      <div className="calc-value">
        {result ?? ' '}
      </div>
    </div>
  );
}