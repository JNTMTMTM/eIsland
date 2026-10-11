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
 * @file CoordinateGraph.tsx
 * @description 多函数绘图、坐标追踪与交点零点分析。
 * @author 鸡哥
 */


import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import functionPlot, { Chart, type FunctionPlotOptions, type FunctionPlotDatum } from 'function-plot';
import { normalizeExpressionForPlot } from '../utils/expressionUtils';
import { compileNumericFormula, formatDisplay } from '../utils/calculatorUtils';
import { findRealRoots } from '../utils/numericRoots';

const COLORS = ['#6390ff', '#f5a65b', '#6dd3a0', '#d88cf5', '#f57186'];
interface GraphPoint { x: number; y: number; label: string; kind: 'zero' | 'intersection' }

/** 绘制多条函数，并提供坐标追踪、零点和交点数值分析。
 * @param expression - 当前公式编辑器中的表达式
 * @param initialExtra - 历史恢复时的附加函数
 * @param onAnalyze - 成功分析后的记录回调
 * @param renderLayout - 组合图像与独立分析区的页面布局
 * @returns 图像、附加函数和分析控制区
 */
export function CoordinateGraph({ expression, initialExtra = '', onAnalyze, renderLayout }: {
  expression: string; initialExtra?: string; onAnalyze?: (extra: string, result: string) => void;
  renderLayout?: (graph: ReactElement, analysis: ReactElement) => ReactElement;
}): ReactElement {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<FunctionPlotOptions | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState(initialExtra);
  const [points, setPoints] = useState<GraphPoint[]>([]);
  const [analyzed, setAnalyzed] = useState(false); const [identical, setIdentical] = useState(false);
  const [trace, setTrace] = useState<{ x: number; y: number; index: number } | null>(null);
  const expressions = [expression || '0', ...extra.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4)];
  const onTip = useCallback((point: { x: number; y: number; index: number }): void => {
    if (Number.isFinite(point.x) && Number.isFinite(point.y)) setTrace(point);
  }, []);
  const renderPlot = useCallback((): void => {
    const canvas = plotRef.current;
    if (!canvas || canvas.clientWidth < 80 || canvas.clientHeight < 80) return;
    try {
      setError(null);
      const options = optionsRef.current ?? {
        target: canvas, grid: true,
        xAxis: { position: 'sticky' as const, domain: [-10, 10] },
        yAxis: { position: 'sticky' as const, domain: [-10, 10] },
        tip: { xLine: true, yLine: true },
      };
      optionsRef.current = options; options.width = canvas.clientWidth; options.height = canvas.clientHeight;
      const functions = [expression || '0', ...extra.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4)];
      options.data = functions.map((formula, index): FunctionPlotDatum => ({ fn: normalizeExpressionForPlot(formula), color: COLORS[index], graphType: 'polyline' }));
      if (points.length) options.data.push({ fnType: 'points', graphType: 'scatter', points: points.map((point) => [point.x, point.y]), color: '#f5a65b', skipTip: true });
      chartRef.current?.removeListener('tip:update', onTip);
      chartRef.current = functionPlot(options);
      chartRef.current?.on('tip:update', onTip);
    } catch { canvas.replaceChildren(); setError(t('calculator.coordinate.error')); }
  }, [expression, extra, points, onTip, t]);
  useEffect(() => { setPoints([]); setAnalyzed(false); setIdentical(false); setTrace(null); }, [expression, extra]);
  useEffect(() => { renderPlot(); }, [renderPlot]);
  useEffect(() => {
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(renderPlot);
    if (plotRef.current) observer?.observe(plotRef.current);
    window.addEventListener('resize', renderPlot);
    return () => { observer?.disconnect(); window.removeEventListener('resize', renderPlot); };
  }, [renderPlot]);
  useEffect(() => () => {
    chartRef.current?.removeAllListeners(); const id = optionsRef.current?.id;
    if (id) Reflect.deleteProperty(Chart.cache, id);
  }, []);
  const analyze = (): void => {
    try {
      const functions = expressions.map((formula) => compileNumericFormula(formula));
      const domain = chartRef.current?.meta?.xScale.domain() ?? [-10, 10];
      const found: GraphPoint[] = []; let overlaps = false;
      functions.forEach((fn, index) => {
        const result = findRealRoots(fn, domain[0], domain[1]); overlaps ||= result.identicallyZero;
        result.roots.forEach((x) => found.push({ x, y: 0, kind: 'zero', label: 'f' + (index + 1) }));
        functions.slice(index + 1).forEach((other, offset) => {
          const intersections = findRealRoots((x) => fn(x) - other(x), domain[0], domain[1]); overlaps ||= intersections.identicallyZero;
          intersections.roots.forEach((x) => found.push({ x, y: fn(x), kind: 'intersection', label: 'f' + (index + 1) + ' ∩ f' + (index + offset + 2) }));
        });
      });
      setPoints(found); setIdentical(overlaps); setAnalyzed(true); setError(null);
      const summary = found.map((point) => point.label + ': (' + formatDisplay(point.x) + ', ' + formatDisplay(point.y) + ')').join('\n');
      onAnalyze?.(extra, summary || t(overlaps ? 'calculator.graph.identical' : 'calculator.graph.none'));
    } catch { setError(t('calculator.coordinate.error')); }
  };
  const graph = <div className="calc-graph-workspace">
    <div className="coordinate-graph-container" aria-label={t('calculator.coordinate.plot')}>
      <div className="coordinate-graph-canvas" ref={plotRef} />
      {error && <div className="coordinate-graph-error" role="status">{error}</div>}
    </div>
    <output className="calc-graph-trace">{trace ? 'f' + (trace.index + 1) + ': x = ' + formatDisplay(trace.x) + ', y = ' + formatDisplay(trace.y) : t('calculator.graph.tracking')}</output>
  </div>;
  const analysis = <section className="calc-graph-analysis" aria-label={t('calculator.graph.controls')}>
      <label>{t('calculator.graph.extra')}<textarea rows={3} value={extra} onChange={(event) => setExtra(event.target.value)} /></label>
      <div className="calc-tools">
        <button className="calc-tool-btn" type="button" onClick={analyze}>{t('calculator.graph.analyze')}</button>
        <button className="calc-tool-btn" type="button" onClick={() => { if (optionsRef.current) { optionsRef.current.xAxis!.domain = [-10, 10]; optionsRef.current.yAxis!.domain = [-10, 10]; } renderPlot(); }}>{t('calculator.graph.reset')}</button>
      </div>
      {analyzed && <div role="status">
        <p>{t('calculator.graph.hint')}</p>
        {points.length === 0 && !identical && <p>{t('calculator.graph.none')}</p>}
        {identical && <p>{t('calculator.graph.identical')}</p>}
        {points.map((point) => <p key={point.kind + point.label + point.x}>{t(point.kind === 'zero' ? 'calculator.graph.zero' : 'calculator.graph.intersection')} {point.label}: ({formatDisplay(point.x)}, {formatDisplay(point.y)})</p>)}
      </div>}
    </section>;
  return renderLayout ? renderLayout(graph, analysis) : graph;
}
