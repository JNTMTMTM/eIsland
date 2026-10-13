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
    displayMode: true,
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
  // 光标更新时复用 HTML 属性，避免重建点击目标和 KaTeX 的锚点 DOM。
  const markup = useMemo(() => ({ __html: html }), [html]);
  const [measuredAnchors, setMeasuredAnchors] = useState<MeasuredAnchor[]>([]);
  const caretRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let disposed = false;

    const measure = (): void => {
      if (disposed) return;
      const rootRect = root.getBoundingClientRect();
      // DOM 矩形包含父容器的缩放，覆盖层坐标需要还原为本地 CSS 像素。
      const scaleX = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
      const scaleY = root.offsetHeight ? rootRect.height / root.offsetHeight : 1;
      const nextMeasurements = compilation.anchors.flatMap((anchor) => {
        const element = root.querySelector<HTMLElement>(`[data-formula-anchor="${anchor.id}"]`);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [{
          anchor,
          rect: {
            left: (rect.left - rootRect.left) / (scaleX || 1),
            top: (rect.top - rootRect.top) / (scaleY || 1),
            width: rect.width / (scaleX || 1),
            height: rect.height / (scaleY || 1),
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
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [compilation, html]);

  const caret = getFormulaKatexCaret(cursor, measuredAnchors);
  useLayoutEffect(() => {
    // 只滚动公式自己的视口，避免改变 MaxExpand 或独立窗口的外部滚动位置。
    const viewport = rootRef.current?.closest<HTMLElement>('.calc-expression');
    const caretElement = caretRef.current;
    if (!viewport || !caretElement) return;
    const viewportRect = viewport.getBoundingClientRect();
    const caretRect = caretElement.getBoundingClientRect();
    const scale = viewport.offsetWidth ? viewportRect.width / viewport.offsetWidth : 1;
    if (caretRect.right > viewportRect.right - 8) viewport.scrollLeft += (caretRect.right - viewportRect.right + 8) / (scale || 1);
    if (caretRect.left < viewportRect.left + 8) viewport.scrollLeft -= (viewportRect.left - caretRect.left + 8) / (scale || 1);
  }, [cursor, caret?.left, caret?.top]);

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

  return (
    <span ref={rootRef} className="calc-katex-expression" onClick={handleClick}>
      <span className="calc-katex-render" dangerouslySetInnerHTML={markup} />
      {caret ? (
        <span
          className="calc-cursor calc-katex-cursor"
          ref={caretRef}
          aria-hidden="true"
          style={{ left: caret.left, top: caret.top, height: caret.height }}
        />
      ) : null}
    </span>
  );
}
