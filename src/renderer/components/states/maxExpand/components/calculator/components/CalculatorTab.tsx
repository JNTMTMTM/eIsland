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
 * @description 最大展开模式 — 计算器 Tab — 四则运算计算器，架构支持科学函数拓展
 * @author 鸡哥
 */

import { useCallback, type ReactElement } from 'react';
import { CalculatorIcon } from '../../../../../../utils/SvgIcon';
import { useCalculator, type CalcOperator } from '../hooks/useCalculator';

/** 按钮配置项 */
interface CalcButtonDef {
  /** 文本标签（数字、C、%、.、= 等无图标的按钮） */
  label?: string;
  /** SVG 图标路径（有图标的按钮） */
  icon?: string;
  /** 图标 alt 文本 / 按钮 key */
  alt: string;
  action: 'digit' | 'operator' | 'equals' | 'clear' | 'backspace' | 'dot' | 'toggleSign' | 'percentage';
  value?: string;
  className?: string;
}

/** 按钮布局定义（4×5 网格） */
const BUTTON_LAYOUT: CalcButtonDef[][] = [
  [
    { label: 'C', alt: 'C', action: 'clear', className: 'calc-btn--func' },
    { icon: CalculatorIcon.PLUS_MINUS, alt: '±', action: 'toggleSign', className: 'calc-btn--func' },
    { label: '%', alt: '%', action: 'percentage', className: 'calc-btn--func' },
    { icon: CalculatorIcon.DIVISION, alt: '÷', action: 'operator', value: '÷', className: 'calc-btn--op' },
  ],
  [
    { label: '7', alt: '7', action: 'digit', value: '7' },
    { label: '8', alt: '8', action: 'digit', value: '8' },
    { label: '9', alt: '9', action: 'digit', value: '9' },
    { icon: CalculatorIcon.MULTIPLICATION, alt: '×', action: 'operator', value: '×', className: 'calc-btn--op' },
  ],
  [
    { label: '4', alt: '4', action: 'digit', value: '4' },
    { label: '5', alt: '5', action: 'digit', value: '5' },
    { label: '6', alt: '6', action: 'digit', value: '6' },
    { icon: CalculatorIcon.MINUS, alt: '-', action: 'operator', value: '-', className: 'calc-btn--op' },
  ],
  [
    { label: '1', alt: '1', action: 'digit', value: '1' },
    { label: '2', alt: '2', action: 'digit', value: '2' },
    { label: '3', alt: '3', action: 'digit', value: '3' },
    { icon: CalculatorIcon.PLUS, alt: '+', action: 'operator', value: '+', className: 'calc-btn--op' },
  ],
  [
    { label: '0', alt: '0', action: 'digit', value: '0', className: 'calc-btn--zero' },
    { label: '.', alt: '.', action: 'dot' },
    { icon: CalculatorIcon.BACKSPACE, alt: '⌫', action: 'backspace' },
    { label: '=', alt: '=', action: 'equals', className: 'calc-btn--equals' },
  ],
];

/**
 * Calculator Tab — 最大展开模式下的计算器面板
 */
export function CalculatorTab(): ReactElement {
  const calc = useCalculator();

  /**
   * 根据按钮配置分发操作。
   * 将按钮动作映射到 hook 方法，保持 UI 与逻辑解耦。
   */
  const handleButton = useCallback((def: CalcButtonDef): void => {
    switch (def.action) {
      case 'digit':
        calc.inputDigit(def.value!);
        break;
      case 'operator':
        calc.setOperator(def.value as CalcOperator);
        break;
      case 'equals':
        calc.calculate();
        break;
      case 'clear':
        calc.clear();
        break;
      case 'backspace':
        calc.backspace();
        break;
      case 'dot':
        calc.inputDot();
        break;
      case 'toggleSign':
        calc.toggleSign();
        break;
      case 'percentage':
        calc.percentage();
        break;
    }
  }, [calc]);

  /** 动态计算显示字体大小：数字越长字号越小 */
  const displayFontSize = calc.display.length > 10 ? '22px' : calc.display.length > 7 ? '28px' : '36px';

  return (
    <div className="max-expand-tab-panel calculator-panel">
      {/* 显示区域 */}
      <div className="calc-display">
        <div className="calc-expression">{calc.expression || ' '}</div>
        <div className="calc-value" style={{ fontSize: displayFontSize }}>
          {calc.display}
        </div>
      </div>

      {/* 按钮网格 */}
      <div className="calc-buttons">
        {BUTTON_LAYOUT.map((row, rowIdx) => (
          <div className="calc-row" key={rowIdx}>
            {row.map((btn) => (
              <button
                key={btn.alt}
                type="button"
                className={`calc-btn ${btn.className ?? ''}`}
                onClick={() => handleButton(btn)}
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
    </div>
  );
}
