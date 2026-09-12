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
 * @file worldClockUtils.test.ts
 * @description 世界时钟城市覆盖、翻译、搜索与时间格式回归测试
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';
import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { listSupportedTimezones } from '@multisystemsuite/timezone-engine-core';
import { DEFAULT_CITIES } from '../config/worldClockConfig';
import { TIMEZONE_LABELS } from '../config/timezoneLabels';
import { WorldClockCard } from '../components/WorldClockCard';
import { WorldClockCityPicker } from '../components/WorldClockCityPicker';
import { buildAllTicks, buildTick, filterTimezoneOptions, getAllTimezoneOptions, getCanonicalTimezone, getCityLabel, getTimezoneCountryCode, normalizeCities } from './worldClockUtils';

const i18n = createInstance();
const zh = JSON.parse(readFileSync('i18n/zh-CN.json', 'utf8'));
const en = JSON.parse(readFileSync('i18n/en-US.json', 'utf8'));

beforeAll(async () => {
  await i18n.init({ lng: 'zh-CN', fallbackLng: false, resources: { 'zh-CN': { translation: zh }, 'en-US': { translation: en } } });
});

describe('world clock city catalog', () => {
  it('includes every runtime timezone plus UTC and keeps every city reachable', () => {
    const options = getAllTimezoneOptions();
    const timezones = new Set(options.map(option => option.timezone));
    for (const timezone of [...listSupportedTimezones(), 'UTC']) expect(timezones.has(timezone)).toBe(true);
    expect(filterTimezoneOptions(options, '', i18n.getFixedT('zh-CN'))).toHaveLength(options.length);
    expect(options.length).toBeGreaterThan(400);
    for (const option of options) expect(() => new Intl.DateTimeFormat('en', { timeZone: option.timezone })).not.toThrow();
    expect(new Set(options.map(option => option.timezone + ':' + option.labelKey)).size).toBe(options.length);
    for (const option of options.filter(option => option.timezone !== 'UTC')) {
      expect(option.countryCode, option.timezone).toMatch(/^[a-z]{2}$/);
    }
  });

  it('resolves all configured translations in both languages without fallback', () => {
    const keys = [...Object.values(TIMEZONE_LABELS), ...getAllTimezoneOptions().map(option => option.labelKey)];
    for (const lng of ['zh-CN', 'en-US']) {
      for (const key of keys) expect(i18n.exists(key, { lng }), lng + ': ' + key).toBe(true);
    }
  });

  it('finds common cities by localized name, English name and timezone', () => {
    const options = getAllTimezoneOptions();
    const t = i18n.getFixedT('zh-CN');
    for (const query of ['北京', '深圳', '新德里', '旧金山', '孟买', '檀香山', '加德满都', '巴库', '第比利斯', '埃里温']) {
      expect(filterTimezoneOptions(options, query, t).length, query).toBeGreaterThan(0);
    }
    expect(filterTimezoneOptions(options, '  san francisco  ', t)[0].timezone).toBe('America/Los_Angeles');
    expect(filterTimezoneOptions(options, 'Asia/Shanghai', t).length).toBeGreaterThan(0);
    for (const query of ['Kolkata', 'Kyiv', 'Ho Chi Minh City', 'Asia/Kolkata']) {
      expect(filterTimezoneOptions(options, query, t).length, query).toBeGreaterThan(0);
    }
    expect(filterTimezoneOptions(options, 'nonexistent city', t)).toEqual([]);
  });

  it('offers a validated catalog when runtime enumeration is unavailable', () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue([]);
    const options = getAllTimezoneOptions();
    expect(options.length).toBeGreaterThan(400);
    expect(options.some(option => option.timezone === 'UTC')).toBe(true);
    expect(options.some(option => option.timezone === 'Asia/Beijing')).toBe(false);
    expect(options.some(option => option.timezone === 'America/Honolulu')).toBe(false);
  });
});

describe('world clock translation and time', () => {
  it('renders the entire picker with translated city labels', async () => {
    await i18n.changeLanguage('zh-CN');
    const options = getAllTimezoneOptions();
    const markup = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCityPicker, {
      visible: true, existingTimezones: [], options, onSelect: vi.fn(), onClose: vi.fn(),
    })));
    expect(markup).toContain('北京');
    expect(markup).toContain('开普敦');
    expect(markup).toContain('fi-cn');
    expect(markup).toContain('fi-za');
    expect(markup.match(/class="world-clock-picker-item"/g)).toHaveLength(options.length);
  });

  it('renders a saved card in the active language after a language switch', async () => {
    const tick = buildTick(DEFAULT_CITIES[0], new Date('2026-01-01T00:00:00Z'), 'UTC', 'en-US');
    await i18n.changeLanguage('en-US');
    const english = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, { tick, onRemove: vi.fn() })));
    expect(english).toContain('Shanghai');
    expect(english).toContain('fi-cn');
    await i18n.changeLanguage('zh-CN');
    const chinese = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, { tick, onRemove: vi.fn() })));
    expect(chinese).toContain('上海');
  });

  it('translates existing saved clocks and defaults at render time', async () => {
    const [legacy] = normalizeCities([{ timezone: 'Asia/Shanghai', label: '上海', order: 0 }]);
    await i18n.changeLanguage('en-US');
    expect(getCityLabel(legacy, i18n.t)).toBe('Shanghai');
    expect(DEFAULT_CITIES.map(city => getCityLabel(city, i18n.t))).toEqual(['Shanghai', 'New York', 'London', 'Tokyo', 'Sydney']);
    await i18n.changeLanguage('zh-CN');
    expect(getCityLabel(legacy, i18n.t)).toBe('上海');
  });

  it('preserves a named city translation key through persistence and ticks', () => {
    const option = getAllTimezoneOptions().find(city => city.label === 'Beijing')!;
    const [saved] = normalizeCities(JSON.parse(JSON.stringify([{ ...option, order: 0 }])));
    const tick = buildTick(saved, new Date('2026-01-01T00:00:00Z'), 'Asia/Shanghai', 'zh-CN');
    expect(tick.timezone).toBe('Asia/Shanghai');
    expect(getCityLabel(tick, i18n.getFixedT('zh-CN'))).toBe('北京');
    expect(getCityLabel(tick, i18n.getFixedT('en-US'))).toBe('Beijing');
    expect(tick.countryCode).toBe('cn');
  });

  it('maps IANA aliases and multi-country regions to their correct flags', () => {
    for (const [timezone, countryCode] of [
      ['Asia/Shanghai', 'cn'], ['Europe/London', 'gb'], ['America/New_York', 'us'],
      ['Asia/Calcutta', 'in'], ['Europe/Kiev', 'ua'], ['Pacific/Truk', 'fm'],
      ['America/Godthab', 'gl'], ['Antarctica/Casey', 'aq'],
    ]) expect(getTimezoneCountryCode(timezone)).toBe(countryCode);
    expect(getTimezoneCountryCode('UTC')).toBeUndefined();
  });

  it('treats modern and legacy IANA names as the same timezone', () => {
    for (const [modern, legacy] of [['Asia/Kolkata', 'Asia/Calcutta'], ['Asia/Kathmandu', 'Asia/Katmandu'], ['Europe/Kyiv', 'Europe/Kiev']]) {
      expect(getCanonicalTimezone(modern)).toBe(getCanonicalTimezone(legacy));
      expect(buildTick({ timezone: modern, label: modern, order: 0 }, new Date(), legacy).isLocal).toBe(true);
    }
  });

  it('formats time without the dependency English date and honors fractional offsets', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    for (const [timezone, expected] of [['Asia/Kolkata', '05:30'], ['Asia/Kathmandu', '05:45'], ['Pacific/Chatham', '13:45'], ['UTC', '00:00']]) {
      const tick = buildTick({ timezone, label: timezone, order: 0 }, now, 'UTC', 'zh-CN');
      expect(tick.formattedTime).toBe(expected);
      expect(tick.formattedDate).toBe(new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, month: 'numeric', day: 'numeric' }).format(now));
    }
  });

  it('uses seasonal timezone rules and does not reorder the stored city array', () => {
    const city = { timezone: 'America/New_York', label: 'New York', order: 0 };
    expect(buildTick(city, new Date('2026-01-01T12:00:00Z'), 'UTC', 'en-US').formattedTime).toBe('07:00');
    expect(buildTick(city, new Date('2026-07-01T12:00:00Z'), 'UTC', 'en-US').formattedTime).toBe('08:00');
    const cities = [{ timezone: 'UTC', label: 'UTC', order: 1 }, city];
    expect(buildAllTicks(cities, 'UTC')[0].timezone).toBe(city.timezone);
    expect(cities[0].timezone).toBe('UTC');
  });
});
