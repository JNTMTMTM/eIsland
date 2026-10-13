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
 * @file HistoryMath.tsx
 * @description 历史记录的只读数学排版，解析失败时保留原文。
 * @author 鸡哥
 */

import { useMemo, type ReactElement } from 'react';
import katex from 'katex';
import type { HistoryMathPart } from '../utils/historyMathUtils';

/** 渲染由历史格式化器生成的数学片段。
 * @param props - 原文与安全 TeX
 * @returns 可访问的只读公式
 */
export function HistoryMath({ part }: { part: HistoryMathPart }): ReactElement {
  const html = useMemo(() => {
    if (!part.tex) return null;
    try { return katex.renderToString(part.tex, { displayMode: true, throwOnError: true, trust: false, strict: 'ignore' }); }
    catch { return null; }
  }, [part.tex]);
  return html
    ? <span className="calc-history-math" role="math" aria-label={part.text}><span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} /></span>
    : <span className="calc-history-text">{part.text}</span>;
}
