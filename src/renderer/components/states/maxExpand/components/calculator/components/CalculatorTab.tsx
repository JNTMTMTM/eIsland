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
 * @description 最大展开模式计算器，组合公式编辑区与输入按钮。
 * @author 鸡哥
 */

import { useCallback, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalcButtonDef, CalcMode, CalcOperator, ScientificFn } from '../types/calculatorTypes';
import { BUTTON_LAYOUT, SCIENTIFIC_FN_LAYOUT } from '../config/calculatorConfig';
import { useCalculator } from '../hooks/useCalculator';
import { CalcDisplay } from './CalcDisplay';
import { CalculatorSidebar } from './CalculatorSidebar';

function ButtonGrid({
  layout,
  onButton,
  className,
}: {
  layout: CalcButtonDef[][];
  onButton: (definition: CalcButtonDef) => void;
  className?: string;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={`calc-buttons${className ? ` ${className}` : ''}`}>
      {layout.map((row, rowIndex) => (
        <div className="calc-row" key={rowIndex}>
          {row.map((button) => (
            <button
              className={`calc-btn ${button.className ?? ''}`}
              key={button.alt}
              type="button"
              aria-label={button.labelKey ? t(button.labelKey) : button.alt}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onButton(button)}
            >
              {button.icon
                ? <img className="calc-btn-icon" src={button.icon} alt={button.alt} />
                : button.label
              }
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染最大展开模式下的公式编辑计算器。
 * @returns 计算器面板
 */
export function CalculatorTab(): ReactElement {
  const calculator = useCalculator();
  const [activeMode, setActiveMode] = useState<CalcMode>('arithmetic');
  const [collapsed, setCollapsed] = useState(true);

  const handleSwitchMode = useCallback((mode: CalcMode): void => {
    setActiveMode(mode);
  }, []);

  const handleToggleCollapse = useCallback((): void => {
    setCollapsed((previous) => !previous);
  }, []);

  const handleButton = useCallback((definition: CalcButtonDef): void => {
    switch (definition.action) {
      case 'digit': calculator.inputDigit(definition.value!); break;
      case 'operator': calculator.inputOperator(definition.value as CalcOperator); break;
      case 'equals': calculator.calculate(); break;
      case 'clear': calculator.clear(); break;
      case 'backspace': calculator.backspace(); break;
      case 'dot': calculator.inputDot(); break;
      case 'toggleSign': calculator.toggleSign(); break;
      case 'percentage': calculator.percentage(); break;
      case 'scientific': calculator.applyScientific(definition.value as ScientificFn); break;
    }
  }, [calculator]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key;
    if (/^[0-9]$/.test(key)) calculator.inputDigit(key);
    else if (key === '.') calculator.inputDot();
    else if (key === '+' || key === '-') calculator.inputOperator(key);
    else if (key === '*' || key === 'x' || key === 'X') calculator.inputOperator('×');
    else if (key === '/') calculator.inputOperator('÷');
    else if (key === '^' || key === '(' || key === ')' || key === ',') calculator.inputText(key);
    else if (key === '%') calculator.percentage();
    else if (key === 'Enter' || key === '=') calculator.calculate();
    else if (key === 'Backspace') calculator.backspace();
    else if (key === 'Delete') calculator.deleteForward();
    else if (key === 'ArrowLeft') calculator.moveCursorHorizontal(-1);
    else if (key === 'ArrowRight') calculator.moveCursorHorizontal(1);
    else if (key === 'Home') calculator.moveCursorBoundary('start');
    else if (key === 'End') calculator.moveCursorBoundary('end');
    else return;
    event.preventDefault();
  }, [calculator]);

  const isScientific = activeMode === 'scientific';
  const formulaLength = calculator.formula.length;
  const displayFontSize = formulaLength > 24 ? '20px' : formulaLength > 14 ? '26px' : '34px';

  return (
    <div className="max-expand-tab-panel calculator-panel">
      <CalculatorSidebar
        activeMode={activeMode}
        collapsed={collapsed}
        onSwitchMode={handleSwitchMode}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="calc-main">
        <CalcDisplay
          cursor={calculator.cursor}
          document={calculator.document}
          fontSize={displayFontSize}
          result={calculator.result}
          hasResult={calculator.result !== null}
          onCursorChange={calculator.moveCursor}
          onMoveEnd={() => calculator.moveCursorBoundary('end')}
          onKeyDown={handleKeyDown}
        />

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