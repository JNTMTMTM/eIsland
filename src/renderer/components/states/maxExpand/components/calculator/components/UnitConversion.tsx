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
 * @file UnitConversion.tsx
 * @description 实时单位换算界面。
 * @author 鸡哥
 */


import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CONVERSION_UNITS, convertUnit, type UnitCategory } from '../utils/unitConversionUtils';
import { formatDisplay } from '../utils/calculatorUtils';
import type { CalculatorHistoryFields, CalculatorHistoryInput } from '../utils/historyUtils';

const CATEGORY_LABELS = { length: 'calculator.units.length', area: 'calculator.units.area', volume: 'calculator.units.volume', mass: 'calculator.units.mass', temperature: 'calculator.units.temperature', time: 'calculator.units.time', speed: 'calculator.units.speed' };

/** 渲染实时单位换算和双向交换操作。
 * @param props - 历史恢复输入和成功换算记录回调
 * @returns 单位换算面板
 */
export function UnitConversion({ initial, onRecord }: {
  initial?: CalculatorHistoryFields<'unitConversion'>; onRecord?: (entry: CalculatorHistoryInput) => void;
} = {}): ReactElement {
  const { t } = useTranslation();
  const [category, setCategory] = useState<UnitCategory>(initial?.category ?? 'length');
  const [from, setFrom] = useState(initial?.from ?? 'm'); const [to, setTo] = useState(initial?.to ?? 'cm');
  const [value, setValue] = useState(initial?.value ?? '1');
  const [edited, setEdited] = useState(false);
  const units = CONVERSION_UNITS.filter((unit) => unit.category === category);
  let result: number | null = null; let error = false;
  try { if (value.trim()) result = convertUnit(Number(value), from, to); } catch { error = true; }
  const fromSymbol = units.find((unit) => unit.id === from)?.symbol;
  const toSymbol = units.find((unit) => unit.id === to)?.symbol;
  useEffect(() => {
    if (!edited || result === null) return;
    onRecord?.({ mode: 'unitConversion', formula: value + ' ' + fromSymbol + ' → ' + toSymbol,
      result: formatDisplay(result) + ' ' + toSymbol, input: { category, from, to, value } });
  }, [edited, result, value, category, from, to, fromSymbol, toSymbol, onRecord]);
  return <section className="calc-feature-panel calc-workbench calc-unit-workbench">
    <header className="calc-workbench-heading">
      <h3>{t('calculator.modes.unitConversion')}</h3>
      <label className="calc-unit-category">{t('calculator.units.category')}
        <select value={category} onChange={(event) => {
          setEdited(true);
          const next = event.target.value as UnitCategory; const choices = CONVERSION_UNITS.filter((unit) => unit.category === next);
          setCategory(next); setFrom(choices[0].id); setTo(choices[1].id);
        }}>{(Object.keys(CATEGORY_LABELS) as UnitCategory[]).map((item) => <option key={item} value={item}>{t(CATEGORY_LABELS[item])}</option>)}</select>
      </label>
    </header>
    <div className="calc-unit-pair">
      <section className="calc-workbench-card calc-unit-card">
        <label>{t('calculator.units.from')}<select value={from} onChange={(event) => { setFrom(event.target.value); setEdited(true); }}>
          {units.map((unit) => <option value={unit.id} key={unit.id}>{unit.symbol}</option>)}</select>
        </label>
        <label className="calc-unit-value">{t('calculator.units.value')}
          <input inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setEdited(true); }} />
        </label>
      </section>
      <button className="calc-unit-swap" type="button" aria-label={t('calculator.units.swap')} title={t('calculator.units.swap')}
        onClick={() => { setFrom(to); setTo(from); setEdited(true); if (result !== null) setValue(String(result)); }}>
        <span aria-hidden="true">⇄</span>
      </button>
      <section className="calc-workbench-card calc-workbench-result calc-unit-card">
        <label>{t('calculator.units.to')}<select value={to} onChange={(event) => { setTo(event.target.value); setEdited(true); }}>
          {units.map((unit) => <option value={unit.id} key={unit.id}>{unit.symbol}</option>)}</select>
        </label>
        <div className="calc-unit-value">
          <span>{t('calculator.workbench.result')}</span>
          <output className={'calc-feature-result' + (error ? ' calc-workbench-error' : '')} aria-live="polite">
            {error ? t('calculator.units.error') : result === null ? '' : formatDisplay(result) + ' ' + toSymbol}
          </output>
        </div>
      </section>
    </div>
  </section>;
}
