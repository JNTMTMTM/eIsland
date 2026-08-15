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
 * @description 计算器公式编辑显示区，负责光标、点击定位和科学表达式排版。
 * @author 鸡哥
 */

import { useRef, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react';
import { readFunctionOpenToken } from '../utils/formulaCursorUtils';

interface CalcDisplayProps {
  formula: string;
  result: string | null;
  cursor: number;
  fontSize: string;
  onCursorChange: (position: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function isSuperscriptCharacter(character: string): boolean {
  return /[a-zA-Z0-9π.]/.test(character);
}

function renderFormula(formula: string, cursor: number, onCursorChange: (position: number) => void): ReactElement[] {
  const nodes: ReactElement[] = [];
  let index = 0;
  let exponent = false;
  let parenthesizedExponent = false;

  while (index < formula.length) {
    if (index === cursor) {
      nodes.push(<span className="calc-cursor" key={`cursor-${index}`} aria-hidden="true" />);
    }

    const tokenIndex = index;
    const character = formula[tokenIndex];
    const functionToken = readFunctionOpenToken(formula, tokenIndex);
    if (functionToken) {
      const handleFunctionClick = (event: MouseEvent<HTMLSpanElement>): void => {
        event.stopPropagation();
        (event.currentTarget.closest('.calc-display') as HTMLElement | null)?.focus();
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = event.clientX - bounds.left < bounds.width / 2
          ? tokenIndex
          : tokenIndex + functionToken.length;
        onCursorChange(position);
      };

      nodes.push(
        <span
          className={exponent ? 'calc-token calc-token--superscript' : 'calc-token'}
          key={`token-${tokenIndex}`}
          onClick={handleFunctionClick}
        >
          {functionToken}
        </span>,
      );
      index += functionToken.length;
      continue;
    }
    if (character === '^') {
      exponent = true;
      parenthesizedExponent = formula[tokenIndex + 1] === '(';
      if (parenthesizedExponent && cursor === tokenIndex + 1) {
        nodes.push(<span className="calc-cursor" key={`cursor-${cursor}`} aria-hidden="true" />);
      }
      index += parenthesizedExponent ? 2 : 1;
      continue;
    }
    if (parenthesizedExponent && character === ')') {
      exponent = false;
      parenthesizedExponent = false;
      index += 1;
      continue;
    }

    const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
      event.stopPropagation();
      (event.currentTarget.closest('.calc-display') as HTMLElement | null)?.focus();
      const bounds = event.currentTarget.getBoundingClientRect();
      const position = event.clientX - bounds.left < bounds.width / 2 ? tokenIndex : tokenIndex + 1;
      onCursorChange(position);
    };

    nodes.push(
      <span
        className={exponent && (parenthesizedExponent || isSuperscriptCharacter(character))
          ? 'calc-token calc-token--superscript'
          : 'calc-token'}
        key={`token-${tokenIndex}`}
        onClick={handleClick}
      >
        {character}
      </span>,
    );

    if (exponent && !parenthesizedExponent && !isSuperscriptCharacter(character)) exponent = false;
    index += 1;
  }

  if (cursor === formula.length) {
    nodes.push(<span className="calc-cursor" key={`cursor-${cursor}`} aria-hidden="true" />);
  }

  return nodes;
}

/**
 * 渲染可编辑的计算器公式，并将幂指数放到基数右上角。
 * @param props - 公式文本、光标位置和编辑回调
 * @returns 公式显示区域
 */
export function CalcDisplay({
  formula,
  result,
  cursor,
  fontSize,
  onCursorChange,
  onKeyDown,
}: CalcDisplayProps): ReactElement {
  const displayRef = useRef<HTMLDivElement>(null);

  const handleDisplayClick = (): void => {
    displayRef.current?.focus();
    onCursorChange(formula.length);
  };

  return (
    <div
      className="calc-display"
      ref={displayRef}
      role="textbox"
      tabIndex={0}
      autoFocus
      aria-multiline="false"
      onClick={handleDisplayClick}
      onKeyDown={onKeyDown}
    >
      <div className="calc-expression" style={{ fontSize }}>
        {renderFormula(formula, cursor, onCursorChange)}
      </div>
      <div className="calc-value">
        {result ?? ' '}
      </div>
    </div>
  );
}