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
 * @description 坐标绘图组件，支持 y=f(x) 绘图
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import functionPlot from 'function-plot';

/**
 * 坐标绘图组件
 * @returns 绘图区域
 */
export function CoordinateGraph(): ReactElement {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);
  const [expression, setExpression] = useState('x^2');
  const [error, setError] = useState<string | null>(null);

  const renderPlot = useCallback(() => {
    if (!plotRef.current) return;

    try {
      setError(null);
      plotRef.current.innerHTML = '';

      functionPlot({
        target: plotRef.current,
        width: plotRef.current.clientWidth,
        height: plotRef.current.clientHeight,
        grid: true,
        data: [
          {
            fn: expression,
            color: '#6390ff',
          },
        ],
        tip: {
          xLine: true,
          yLine: true,
        },
      });
    } catch (err) {
      setError(t('calculator.coordinate.error', { defaultValue: '无效的表达式' }));
    }
  }, [expression, t]);

  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  useEffect(() => {
    const handleResize = () => {
      renderPlot();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPlot]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpression(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      renderPlot();
    }
  }, [renderPlot]);

  return (
    <div className="coordinate-graph">
      <div className="coordinate-graph-header">
        <div className="coordinate-graph-input-group">
          <span className="coordinate-graph-label">y =</span>
          <input
            type="text"
            className="coordinate-graph-input"
            value={expression}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('calculator.coordinate.placeholder', { defaultValue: '输入函数，如 x^2, sin(x)' })}
            spellCheck={false}
          />
        </div>
        {error && <div className="coordinate-graph-error">{error}</div>}
      </div>
      <div className="coordinate-graph-container" ref={plotRef} />
    </div>
  );
}
