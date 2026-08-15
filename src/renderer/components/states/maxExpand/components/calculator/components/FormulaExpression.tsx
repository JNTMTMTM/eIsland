/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTM/eIsland
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
 */

/**
 * @file FormulaExpression.tsx
 * @description 结构化公式的递归排版与槽位光标渲染。
 * @author 鸡哥
 */

import type { MouseEvent, ReactElement, ReactNode } from 'react';
import type {
  FormulaCursor,
  FormulaDocument,
  FormulaPathStep,
  FormulaSlotName,
  FormulaStructure,
} from '../types/calculatorTypes';
import { readFunctionOpenToken } from '../utils/formulaCursorUtils';

interface FormulaExpressionProps {
  document: FormulaDocument;
  cursor: FormulaCursor;
  onCursorChange: (cursor: FormulaCursor) => void;
}

function pathMatches(left: FormulaPathStep[], right: FormulaPathStep[]): boolean {
  return left.length === right.length
    && left.every((step, index) => step.segmentIndex === right[index].segmentIndex && step.slot === right[index].slot);
}

function renderText(
  value: string,
  activeOffset: number | null,
  onOffsetChange: (offset: number) => void,
  keyPrefix: string,
): ReactElement[] {
  const nodes: ReactElement[] = [];
  let index = 0;
  let exponent = false;
  let parenthesizedExponent = false;

  while (index < value.length) {
    if (index === activeOffset) {
      nodes.push(<span className="calc-cursor" key={`${keyPrefix}-cursor-${index}`} aria-hidden="true" />);
    }

    const tokenIndex = index;
    const character = value[tokenIndex];
    const functionToken = readFunctionOpenToken(value, tokenIndex);
    if (functionToken) {
      const handleFunctionClick = (event: MouseEvent<HTMLSpanElement>): void => {
        event.stopPropagation();
        const bounds = event.currentTarget.getBoundingClientRect();
        onOffsetChange(event.clientX - bounds.left < bounds.width / 2
          ? tokenIndex
          : tokenIndex + functionToken.length);
      };
      nodes.push(
        <span className="calc-token" key={`${keyPrefix}-function-${tokenIndex}`} onClick={handleFunctionClick}>
          {functionToken}
        </span>,
      );
      index += functionToken.length;
      continue;
    }

    if (character === '^') {
      exponent = true;
      parenthesizedExponent = value[tokenIndex + 1] === '(';
      index += parenthesizedExponent ? 2 : 1;
      continue;
    }
    if (parenthesizedExponent && character === ')') {
      if (activeOffset !== null && activeOffset < tokenIndex) {
        nodes.push(<span className="calc-cursor" key={`${keyPrefix}-cursor-exp-${activeOffset}`} aria-hidden="true" />);
      }
      if (index === tokenIndex) {
        const handlePlaceholderClick = (event: MouseEvent<HTMLSpanElement>): void => {
          event.stopPropagation();
          onOffsetChange(tokenIndex);
        };
        nodes.push(
          <span className="calc-token calc-token--superscript calc-token--placeholder" key={`${keyPrefix}-exp-placeholder-${tokenIndex}`} onClick={handlePlaceholderClick}>□</span>,
        );
      }
      exponent = false;
      parenthesizedExponent = false;
      index += 1;
      continue;
    }

    const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      onOffsetChange(event.clientX - bounds.left < bounds.width / 2 ? tokenIndex : tokenIndex + 1);
    };
    nodes.push(
      <span
        className={exponent ? 'calc-token calc-token--superscript' : 'calc-token'}
        key={`${keyPrefix}-token-${tokenIndex}`}
        onClick={handleClick}
      >
        {character}
      </span>,
    );
    index += 1;
  }

  if (activeOffset === value.length) {
    nodes.push(<span className="calc-cursor" key={`${keyPrefix}-cursor-${value.length}`} aria-hidden="true" />);
  }
  return nodes;
}

function FormulaSlot({
  structure,
  structureIndex,
  slot,
  path,
  cursor,
  onCursorChange,
  className = '',
}: {
  structure: FormulaStructure;
  structureIndex: number;
  slot: FormulaSlotName;
  path: FormulaPathStep[];
  cursor: FormulaCursor;
  onCursorChange: (cursor: FormulaCursor) => void;
  className?: string;
}): ReactElement {
  const slotDocument = structure.slots[slot] ?? { segments: [{ type: 'text', value: '' }] };
  const slotPath = [...path, { segmentIndex: structureIndex, slot }];
  const isEmpty = slotDocument.segments.length === 1
    && slotDocument.segments[0].type === 'text'
    && slotDocument.segments[0].value === '';
  const isActive = pathMatches(cursor.path, slotPath);

  const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
    event.stopPropagation();
    if (isEmpty) onCursorChange({ path: slotPath, segmentIndex: 0, offset: 0 });
  };

  return (
    <span className={`calc-slot${isActive ? ' calc-slot--active' : ''}${className ? ` ${className}` : ''}`} onClick={handleClick}>
      {isEmpty && !isActive ? <span className="calc-slot-placeholder">□</span> : null}
      <FormulaDocumentView
        document={slotDocument}
        path={slotPath}
        cursor={cursor}
        onCursorChange={onCursorChange}
      />
    </span>
  );
}

function renderStructure(
  structure: FormulaStructure,
  structureIndex: number,
  path: FormulaPathStep[],
  cursor: FormulaCursor,
  onCursorChange: (cursor: FormulaCursor) => void,
): ReactNode {
  const slot = (name: FormulaSlotName, className = ''): ReactElement => (
    <FormulaSlot
      structure={structure}
      structureIndex={structureIndex}
      slot={name}
      path={path}
      cursor={cursor}
      onCursorChange={onCursorChange}
      className={className}
    />
  );

  switch (structure.kind) {
    case 'logn':
      return <span className="calc-structure calc-logn"><span>log</span>{slot('base', 'calc-logn__base')}<span>(</span>{slot('value')}<span>)</span></span>;
    case 'fraction':
      return <span className="calc-structure calc-fraction"><span className="calc-fraction__part">{slot('numerator')}</span><span className="calc-fraction__line" /><span className="calc-fraction__part">{slot('denominator')}</span></span>;
    case 'sum':
      return <span className="calc-structure calc-large-operator"><span className="calc-large-operator__limits"><span>{slot('upper')}</span><span className="calc-large-operator__symbol">Σ</span><span>x={slot('lower')}</span></span>{slot('body', 'calc-large-operator__body')}</span>;
    case 'integral':
      return <span className="calc-structure calc-large-operator"><span className="calc-large-operator__limits"><span>{slot('upper')}</span><span className="calc-large-operator__symbol">∫</span><span>{slot('lower')}</span></span>{slot('body', 'calc-large-operator__body')}<span>dx</span></span>;
    case 'derivative':
      return <span className="calc-structure calc-derivative"><span className="calc-derivative__operator">d/dx</span><span>(</span>{slot('body')}<span>)</span><span className="calc-derivative__point">|x={slot('point')}</span></span>;
    case 'sqrt':
      return <span className="calc-structure calc-root"><span className="calc-root__sign" aria-hidden="true">√</span><span className="calc-root__radicand">{slot('radicand')}</span></span>;
    case 'root':
      return <span className="calc-structure calc-root"><span className="calc-root__index">{slot('index')}</span><span className="calc-root__sign" aria-hidden="true">√</span><span className="calc-root__radicand">{slot('radicand')}</span></span>;
  }
}

function FormulaDocumentView({
  document,
  path,
  cursor,
  onCursorChange,
}: FormulaExpressionProps & { path: FormulaPathStep[] }): ReactElement {
  return (
    <span className="calc-document">
      {document.segments.map((segment, segmentIndex) => {
        if (segment.type === 'structure') {
          return (
            <span className="calc-document-segment" key={segment.value.id}>
              {renderStructure(segment.value, segmentIndex, path, cursor, onCursorChange)}
            </span>
          );
        }
        const activeOffset = pathMatches(cursor.path, path) && cursor.segmentIndex === segmentIndex
          ? cursor.offset
          : null;
        const onOffsetChange = (offset: number): void => onCursorChange({ path, segmentIndex, offset });
        return (
          <span className="calc-document-segment" key={`text-${segmentIndex}`}>
            {renderText(segment.value, activeOffset, onOffsetChange, `${path.length}-${segmentIndex}`)}
          </span>
        );
      })}
    </span>
  );
}

/**
 * 渲染结构化公式及其活动槽位光标。
 * @param props - 公式文档、光标与定位回调
 * @returns 可交互的结构化公式
 */
export function FormulaExpression({ document, cursor, onCursorChange }: FormulaExpressionProps): ReactElement {
  return <FormulaDocumentView document={document} path={[]} cursor={cursor} onCursorChange={onCursorChange} />;
}