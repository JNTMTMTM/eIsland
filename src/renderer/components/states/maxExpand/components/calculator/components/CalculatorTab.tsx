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
import katex from 'katex';
import type { CalcButtonDef, CalcMode, CalcOperator, ScientificFn } from '../types/calculatorTypes';
import { BUTTON_LAYOUT, SCIENTIFIC_FN_LAYOUT } from '../config/calculatorConfig';
import { useCalculator } from '../hooks/useCalculator';
import { CalcDisplay } from './CalcDisplay';
import { CalculatorSidebar } from './CalculatorSidebar';
import { CoordinateGraph } from './CoordinateGraph';
import { CalculatorHistory } from './CalculatorHistory';
import { useCalculatorHistory } from '../hooks/useCalculatorHistory';

// 静态按键只排版一次，避免每次输入都重复编译全部科学函数。
const BUTTON_MATH = new Map(
  [...BUTTON_LAYOUT.flat(), ...SCIENTIFIC_FN_LAYOUT.flat()]
    .filter((button) => button.tex)
    .map((button) => [button.alt, katex.renderToString(button.tex!, { output: 'html', throwOnError: false })]),
);

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
      {layout.map((row) => (
        <div className="calc-row" key={row.map((button) => button.alt).join(':')}>
          {row.map((button) => (
            <button
              className={`calc-btn ${button.className ?? ''}`}
              key={button.alt}
              type="button"
              aria-label={button.labelKey ? t(button.labelKey) : button.alt}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onButton(button)}
            >
              {button.tex ? (
                <span
                  className="calc-key-math"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: BUTTON_MATH.get(button.alt)! }}
                />
              ) : button.icon
                ? <img className="calc-btn-icon" src={button.icon} alt={button.alt} />
                : <span className="calc-key-label">{button.label}</span>
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
  const { t } = useTranslation();
  const calculator = useCalculator();
  const history = useCalculatorHistory(calculator.document, calculator.result, calculator.angleUnit);
  const [activeMode, setActiveMode] = useState<CalcMode>('arithmetic');
  const [collapsed, setCollapsed] = useState(true);
  const [showScientificKeys, setShowScientificKeys] = useState(true);

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
    if (event.ctrlKey || event.metaKey || event.altKey) return;
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
  const isCoordinate = activeMode === 'coordinate';
  const formulaLength = calculator.formula.length;
  const displayFontSize = formulaLength > 24 ? '20px' : formulaLength > 14 ? '26px' : '34px';
  const display = (
    <CalcDisplay
      key={activeMode}
      cursor={calculator.cursor}
      document={calculator.document}
      fontSize={displayFontSize}
      result={isCoordinate ? null : calculator.result}
      hasResult={!isCoordinate && calculator.result !== null}
      showValue={!isCoordinate}
      onCursorChange={calculator.moveCursor}
      onMoveEnd={() => calculator.moveCursorBoundary('end')}
      onKeyDown={handleKeyDown}
    />
  );

  return (
    <div
      className={`max-expand-tab-panel calculator-panel calculator-panel-${activeMode}`}
      onKeyDown={(event) => { if (event.key === 'Tab') event.stopPropagation(); }}
    >
      <CalculatorSidebar
        activeMode={activeMode}
        collapsed={collapsed}
        onSwitchMode={handleSwitchMode}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="calc-main">
        <div className="calc-toolbar">
          <span className="calc-mode-title">{t(`calculator.modes.${activeMode}`)}</span>
          {isCoordinate ? (
            <span className="calc-function-label" title={t('calculator.coordinate.radianHint')}>
              {'y = f(x) · '}{t('calculator.angleUnit.radianShort')}
            </span>
          ) : (
            <div className="calc-angle-unit" role="group" aria-label={t('calculator.angleUnit.label')}>
              {(['degree', 'radian'] as const).map((unit) => (
                <button
                  className="calc-angle-unit-btn"
                  key={unit}
                  type="button"
                  title={t(`calculator.angleUnit.${unit}`)}
                  aria-label={t(`calculator.angleUnit.${unit}`)}
                  aria-pressed={calculator.angleUnit === unit}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => calculator.setAngleUnit(unit)}
                >
                  {t(`calculator.angleUnit.${unit}Short`)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="calc-tools">
          <button className="calc-tool-btn" type="button" disabled={calculator.answer === null}
            title={t('calculator.answer.hint')} onMouseDown={(event) => event.preventDefault()} onClick={calculator.inputAnswer}>
            {t('calculator.answer.label')}
          </button>
        </div>
        {isCoordinate ? (
          <div className="calc-coordinate-layout">
            <div className="calc-coordinate-controls">
              <button
                type="button"
                className="calc-btn calc-btn-toggle"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowScientificKeys((previous) => !previous)}
                aria-label={t('calculator.coordinate.toggleKeys', { defaultValue: '切换输入面板' })}
              >
                {showScientificKeys ? '123' : 'f(x)'}
              </button>
              {showScientificKeys ? (
                <ButtonGrid layout={SCIENTIFIC_FN_LAYOUT} onButton={handleButton} className="calc-buttons-sci-inner" />
              ) : (
                <ButtonGrid layout={BUTTON_LAYOUT} onButton={handleButton} className="calc-buttons-arith-inner" />
              )}
            </div>
            <div className="calc-coordinate-workspace">
              {display}
              <CoordinateGraph expression={calculator.formula} />
            </div>
          </div>
        ) : (
          <>
            {display}

            {isScientific ? (
              <div className="calc-buttons-dual">
                <ButtonGrid layout={SCIENTIFIC_FN_LAYOUT} onButton={handleButton} className="calc-buttons-sci" />
                <ButtonGrid layout={BUTTON_LAYOUT} onButton={handleButton} className="calc-buttons-arith" />
              </div>
            ) : (
              <ButtonGrid layout={BUTTON_LAYOUT} onButton={handleButton} />
            )}
          </>
        )}
        <CalculatorHistory entries={history.entries} storageError={history.storageError}
          onRestore={(entry) => calculator.restoreFormula(entry.document, entry.angleUnit)}
          onRemove={history.remove} onClear={history.clear} />
      </div>
    </div>
  );
}
