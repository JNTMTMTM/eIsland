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
 * @file useGraphTangent.ts
 * @description 跟随当前鼠标追踪曲线绘制切线，并管理隐藏和缩放重绘。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { EvalBuiltIn, type Chart } from 'function-plot';
import { clipTangent, estimateTangent } from '../utils/tangentUtils';

interface TrackedPoint { x: number; y: number; index: number }

/** 管理绘图区内的数值切线，监听函数保持稳定以避免重复订阅。
 * @param enabled - 是否启动切线分析
 * @param plotRef - SVG 绘图区宿主
 * @param chartRef - 当前绘图实例
 * @returns 坐标追踪、重绘和鼠标离开时的清理回调
 */
export function useGraphTangent(enabled: boolean, plotRef: RefObject<HTMLDivElement | null>, chartRef: RefObject<Chart | null>) {
  const enabledRef = useRef(enabled);
  const pointRef = useRef<TrackedPoint | null>(null);
  const hide = useCallback((): void => {
    plotRef.current?.querySelector('.calc-graph-tangent')?.remove();
  }, [plotRef]);
  const clear = useCallback((): void => { pointRef.current = null; hide(); }, [hide]);
  const clearUntracked = useCallback((): void => {
    if (plotRef.current?.querySelector<SVGGElement>('.inner-tip')?.style.display === 'none') clear();
  }, [plotRef, clear]);
  const refresh = useCallback((): void => {
    const chart = chartRef.current; const point = pointRef.current;
    const content = plotRef.current?.querySelector('g.content');
    if (!enabledRef.current || !chart || !point || !content) { hide(); return; }
    const datum = chart.options.data?.[point.index];
    const xScale = chart.meta.xScale; const yScale = chart.meta.yScale;
    if (!datum || datum.skipTip || !xScale || !yScale) { hide(); return; }
    const tangent = estimateTangent((x) => EvalBuiltIn(datum, 'fn', { x }), point.x);
    const segment = tangent && clipTangent(tangent, xScale.domain(), yScale.domain());
    if (!segment) { hide(); return; }
    let line = content.querySelector<SVGLineElement>('.calc-graph-tangent');
    if (!line) {
      line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('calc-graph-tangent');
      line.setAttribute('aria-hidden', 'true');
      content.appendChild(line);
    }
    line.setAttribute('stroke', datum.color || '#6390ff');
    line.setAttribute('x1', String(xScale(segment[0][0]))); line.setAttribute('y1', String(yScale(segment[0][1])));
    line.setAttribute('x2', String(xScale(segment[1][0]))); line.setAttribute('y2', String(yScale(segment[1][1])));
  }, [chartRef, plotRef, hide]);
  const update = useCallback((point: TrackedPoint): void => {
    pointRef.current = point; refresh();
  }, [refresh]);
  useEffect(() => { enabledRef.current = enabled; refresh(); }, [enabled, refresh]);
  return { update, clear, clearUntracked, refresh };
}
