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
 * @description 坐标绘图组件，使用计算器公式实时绘制 y=f(x)。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import functionPlot from 'function-plot';

interface CoordinateGraphProps {
  expression: string;
}

/**
 * 根据计算器当前公式绘制函数图像。
 * @param expression - 计算器公式序列化后的表达式
 * @returns 绘图区域
 */
export function CoordinateGraph({ expression }: CoordinateGraphProps): ReactElement {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const renderPlot = useCallback((): void => {
    if (!plotRef.current) return;

    try {
      setError(null);
      plotRef.current.innerHTML = '';
      const plotExpression = expression
        .replaceAll('π', 'PI')
        .replaceAll('×', '*')
        .replaceAll('÷', '/');
      functionPlot({
        target: plotRef.current,
        width: plotRef.current.clientWidth,
        height: plotRef.current.clientHeight,
        grid: true,
        data: [{ fn: plotExpression || '0', color: '#6390ff' }],
        tip: { xLine: true, yLine: true },
      });
    } catch {
      setError(t('calculator.coordinate.error', { defaultValue: '无效的表达式' }));
    }
  }, [expression, t]);

  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  useEffect(() => {
    window.addEventListener('resize', renderPlot);
    return () => window.removeEventListener('resize', renderPlot);
  }, [renderPlot]);

  return (
    <div className="coordinate-graph-container" aria-label={t('calculator.coordinate.plot', { defaultValue: '函数图像' })}>
      <div className="coordinate-graph-canvas" ref={plotRef} />
      {error && <div className="coordinate-graph-error">{error}</div>}
    </div>
  );
}