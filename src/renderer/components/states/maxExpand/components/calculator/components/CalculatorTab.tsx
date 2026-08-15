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
 * @file CalculatorTab.tsx
 * @description 最大展开模式 — 计算器 Tab — 薄组合层，由 useCalculator hook 驱动
 * @author 鸡哥
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { CalcOperator, CalcButtonDef, CalcMode, ScientificFn } from '../types/calculatorTypes';
import { BUTTON_LAYOUT, SCIENTIFIC_FN_LAYOUT } from '../config/calculatorConfig';
import { useCalculator } from '../hooks/useCalculator';
import { CalculatorSidebar } from './CalculatorSidebar';

/**
 * 按钮网格渲染组件。
 * @param layout - 按钮布局二维数组
 * @param onButton - 按钮点击回调
 * @param className - 额外 CSS 类名
 */
function ButtonGrid({
  layout,
  onButton,
  className,
}: {
  layout: CalcButtonDef[][];
  onButton: (def: CalcButtonDef) => void;
  className?: string;
}): ReactElement {
  return (
    <div className={`calc-buttons${className ? ` ${className}` : ''}`}>
      {layout.map((row, rowIdx) => (
        <div className="calc-row" key={rowIdx}>
          {row.map((btn) => (
            <button
              key={btn.alt}
              type="button"
              className={`calc-btn ${btn.className ?? ''}`}
              onClick={() => onButton(btn)}
            >
              {btn.icon
                ? <img src={btn.icon} alt={btn.alt} className="calc-btn-icon" />
                : btn.label
              }
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Calculator Tab — 最大展开模式下的计算器面板
 */
export function CalculatorTab(): ReactElement {
  const calc = useCalculator();
  const [activeMode, setActiveMode] = useState<CalcMode>('arithmetic');
  const [collapsed, setCollapsed] = useState(true);

  /** 切换模式，自动展开侧边栏 */
  const handleSwitchMode = useCallback((mode: CalcMode): void => {
    setActiveMode(mode);
    if (mode !== 'arithmetic') setCollapsed(false);
  }, []);

  /** 切换侧边栏展开/收起 */
  const handleToggleCollapse = useCallback((): void => {
    setCollapsed((prev) => !prev);
  }, []);

  /** 分发按钮操作 */
  const handleButton = useCallback((def: CalcButtonDef): void => {
    switch (def.action) {
      case 'digit':       calc.inputDigit(def.value!); break;
      case 'operator':    calc.setOperator(def.value as CalcOperator); break;
      case 'equals':      calc.calculate(); break;
      case 'clear':       calc.clear(); break;
      case 'backspace':   calc.backspace(); break;
      case 'dot':         calc.inputDot(); break;
      case 'toggleSign':  calc.toggleSign(); break;
      case 'percentage':  calc.percentage(); break;
      case 'scientific':  calc.applyScientific(def.value as ScientificFn); break;
    }
  }, [calc]);

  const isScientific = activeMode === 'scientific';

  /** 动态计算显示字体大小：数字越长字号越小 */
  const displayFontSize = calc.display.length > 10 ? '22px' : calc.display.length > 7 ? '28px' : '36px';

  return (
    <div className="max-expand-tab-panel calculator-panel">
      <CalculatorSidebar
        activeMode={activeMode}
        collapsed={collapsed}
        onSwitchMode={handleSwitchMode}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="calc-main">
        <div className="calc-display">
          <div className="calc-expression">{calc.expression || ' '}</div>
          <div className="calc-value" style={{ fontSize: displayFontSize }}>
            {calc.display}
          </div>
        </div>

        {isScientific ? (
          <div className="calc-buttons-dual">
            <ButtonGrid layout={SCIENTIFIC_FN_LAYOUT} onButton={handleButton} className="calc-buttons--sci" />
            <ButtonGrid layout={BUTTON_LAYOUT} onButton={handleButton} className="calc-buttons--arith" />
          </div>
        ) : (
          <ButtonGrid layout={BUTTON_LAYOUT} onButton={handleButton} />
        )}
      </div>
    </div>
  );
}
