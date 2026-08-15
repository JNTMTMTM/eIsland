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
 */

/**
 * @file FormulaExpression.tsx
 * @description 使用 KaTeX 排版结构化公式，并保留槽位光标交互。
 * @author 鸡哥
 */

import katex from 'katex';
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement } from 'react';
import type { FormulaCursor, FormulaDocument } from '../types/calculatorTypes';
import { compileFormulaToKatex, type FormulaKatexAnchor } from '../utils/formulaKatexCompiler';
import { getFormulaKatexCaret, type FormulaKatexRect } from '../utils/formulaKatexPosition';

interface FormulaExpressionProps {
  document: FormulaDocument;
  cursor: FormulaCursor;
  onCursorChange: (cursor: FormulaCursor) => void;
}

interface MeasuredAnchor {
  anchor: FormulaKatexAnchor;
  rect: FormulaKatexRect;
}

function renderKatex(tex: string): string {
  return katex.renderToString(tex, {
    strict: 'ignore',
    throwOnError: false,
    trust: ({ command }) => command === '\\htmlData',
  });
}

function readAnchorId(element: Element): string | null {
  return element.closest<HTMLElement>('[data-formula-anchor]')?.dataset.formulaAnchor ?? null;
}

/**
 * 渲染 KaTeX 公式并把点击映射回结构化光标。
 * @param props - 公式文档、光标和光标更新回调
 * @returns 带 KaTeX 排版和活动光标覆盖层的公式
 */
export function FormulaExpression({ document, cursor, onCursorChange }: FormulaExpressionProps): ReactElement {
  const rootRef = useRef<HTMLSpanElement>(null);
  const compilation = useMemo(() => compileFormulaToKatex(document), [document]);
  const html = useMemo(() => renderKatex(compilation.tex), [compilation.tex]);
  const [measuredAnchors, setMeasuredAnchors] = useState<MeasuredAnchor[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const measure = (): void => {
      const rootRect = root.getBoundingClientRect();
      const nextMeasurements = compilation.anchors.flatMap((anchor) => {
        const element = root.querySelector<HTMLElement>(`[data-formula-anchor="${anchor.id}"]`);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [{
          anchor,
          rect: {
            left: rect.left - rootRect.left,
            top: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
          },
        }];
      });
      setMeasuredAnchors(nextMeasurements);
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    const fontsReady = globalThis.document?.fonts?.ready;
    if (fontsReady) void fontsReady.then(measure);
    return () => observer?.disconnect();
  }, [compilation, html]);

  const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
    const root = rootRef.current;
    const anchorId = readAnchorId(event.target as Element);
    if (!root || !anchorId) return;
    const anchor = compilation.anchors.find((candidate) => candidate.id === anchorId);
    if (!root || !anchor) return;
    const element = root.querySelector<HTMLElement>(`[data-formula-anchor="${anchorId}"]`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const midpoint = rect.width / 2;
    onCursorChange(localX < midpoint ? anchor.start : anchor.end);
    event.stopPropagation();
  };

  const caret = getFormulaKatexCaret(cursor, measuredAnchors);
  return (
    <span ref={rootRef} className="calc-katex-expression" onClick={handleClick}>
      <span className="calc-katex-render" dangerouslySetInnerHTML={{ __html: html }} />
      {caret ? (
        <span
          className="calc-cursor calc-katex-cursor"
          aria-hidden="true"
          style={{ left: caret.left, top: caret.top, height: caret.height }}
        />
      ) : null}
    </span>
  );
}