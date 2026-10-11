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


import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CONVERSION_UNITS, convertUnit, type UnitCategory } from '../utils/unitConversionUtils';
import { formatDisplay } from '../utils/calculatorUtils';

const CATEGORY_LABELS = { length: 'calculator.units.length', area: 'calculator.units.area', volume: 'calculator.units.volume', mass: 'calculator.units.mass', temperature: 'calculator.units.temperature', time: 'calculator.units.time', speed: 'calculator.units.speed' };

/** 渲染实时单位换算和双向交换操作。
 * @returns 单位换算面板
 */
export function UnitConversion(): ReactElement {
  const { t } = useTranslation();
  const [category, setCategory] = useState<UnitCategory>('length');
  const [from, setFrom] = useState('m'); const [to, setTo] = useState('cm');
  const [value, setValue] = useState('1');
  const units = CONVERSION_UNITS.filter((unit) => unit.category === category);
  let result: number | null = null; let error = false;
  try { if (value.trim()) result = convertUnit(Number(value), from, to); } catch { error = true; }
  return <section className="calc-feature-panel">
    <h3>{t('calculator.modes.unitConversion')}</h3>
    <label>{t('calculator.units.category')}
      <select value={category} onChange={(event) => {
        const next = event.target.value as UnitCategory; const choices = CONVERSION_UNITS.filter((unit) => unit.category === next);
        setCategory(next); setFrom(choices[0].id); setTo(choices[1].id);
      }}>{(Object.keys(CATEGORY_LABELS) as UnitCategory[]).map((item) => <option key={item} value={item}>{t(CATEGORY_LABELS[item])}</option>)}</select>
    </label>
    <label>{t('calculator.units.value')}<input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} /></label>
    <div className="calc-feature-grid">
      <label>{t('calculator.units.from')}<select value={from} onChange={(event) => setFrom(event.target.value)}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.symbol}</option>)}</select></label>
      <label>{t('calculator.units.to')}<select value={to} onChange={(event) => setTo(event.target.value)}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.symbol}</option>)}</select></label>
    </div>
    <button className="calc-tool-btn" type="button" onClick={() => { setFrom(to); setTo(from); if (result !== null) setValue(String(result)); }}>{t('calculator.units.swap')}</button>
    <output className="calc-feature-result" aria-live="polite">{error ? t('calculator.units.error') : result === null ? '—' : formatDisplay(result) + ' ' + units.find((unit) => unit.id === to)?.symbol}</output>
  </section>;
}
