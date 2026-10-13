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
 * @file GraphSetResults.tsx
 * @description 按函数展示定义域和值域，区分完整区间与当前视图估计。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplay } from '../utils/calculatorUtils';
import { formatFunctionSet, type FunctionSetResult, type GraphSetKind } from '../utils/graphSetUtils';

export interface GraphSetEntry { formula: string; result: FunctionSetResult | null }

/** 展示逐条函数的区间结果与分析范围。
 * @param kind - 定义域或值域
 * @param entries - 主函数和附加函数的分析结果
 * @returns 分析结果列表
 */
export function GraphSetResults({ kind, entries }: { kind: GraphSetKind; entries: GraphSetEntry[] }): ReactElement {
  const { t } = useTranslation();
  const label = t(kind === 'domain' ? 'calculator.graph.domainName' : 'calculator.graph.rangeName');
  const occurrences = new Map<string, number>();
  const keyedEntries = entries.map((entry) => {
    const occurrence = occurrences.get(entry.formula) ?? 0;
    occurrences.set(entry.formula, occurrence + 1);
    return { entry, key: JSON.stringify([entry.formula, occurrence]) };
  });
  return <section className="calc-graph-set-results" data-kind={kind} role="status" aria-label={label}>
    <strong>{label}</strong>
    {keyedEntries.map(({ entry, key }, index) => <div className="calc-graph-set-card" key={key}>
      <p className="calc-graph-set-formula">{'f' + (index + 1) + '(x) = ' + entry.formula}</p>
      <p className="calc-graph-set-value">{entry.result ? (entry.result.exact ? '' : '≈ ') + formatFunctionSet(entry.result) : t('calculator.coordinate.error')}</p>
      {entry.result && <p className="calc-graph-set-scope">{entry.result.exact ? t('calculator.graph.setComplete') : t('calculator.graph.setEstimated', {
        lower: formatDisplay(entry.result.scope[0]), upper: formatDisplay(entry.result.scope[1]),
      })}</p>}
    </div>)}
  </section>;
}
