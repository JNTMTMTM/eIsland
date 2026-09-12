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
import { getWorldClockTime, listSupportedTimezones } from '@multisystemsuite/timezone-engine-core';
import { DEFAULT_CITIES } from '../config/worldClockConfig';
import { DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG, normalizeOverviewWorldClockConfig } from '../config/overviewWorldClockConfig';
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
    [...listSupportedTimezones(), 'UTC'].forEach(timezone => expect(timezones.has(timezone)).toBe(true));
    expect(filterTimezoneOptions(options, '', i18n.getFixedT('zh-CN'))).toHaveLength(options.length);
    expect(options.length).toBeGreaterThan(400);
    options.forEach(option => expect(() => new Intl.DateTimeFormat('en', { timeZone: option.timezone })).not.toThrow());
    expect(new Set(options.map(option => option.timezone + ':' + option.labelKey)).size).toBe(options.length);
    options.filter(option => option.timezone !== 'UTC').forEach(option => {
      expect(option.countryCode, option.timezone).toMatch(/^[a-z]{2}$/);
    });
  });

  it('resolves all configured translations in both languages without fallback', () => {
    const keys = [...Object.values(TIMEZONE_LABELS), ...getAllTimezoneOptions().map(option => option.labelKey)];
    ['zh-CN', 'en-US'].forEach(lng => {
      keys.forEach(key => expect(i18n.exists(key, { lng }), lng + ': ' + key).toBe(true));
    });
  });

  it('finds common cities by localized name, English name and timezone', () => {
    const options = getAllTimezoneOptions();
    const t = i18n.getFixedT('zh-CN');
    ['北京', '深圳', '新德里', '旧金山', '孟买', '檀香山', '加德满都', '巴库', '第比利斯', '埃里温'].forEach(query => {
      expect(filterTimezoneOptions(options, query, t).length, query).toBeGreaterThan(0);
    });
    expect(filterTimezoneOptions(options, '  san francisco  ', t)[0].timezone).toBe('America/Los_Angeles');
    expect(filterTimezoneOptions(options, 'Asia/Shanghai', t).length).toBeGreaterThan(0);
    ['Kolkata', 'Kyiv', 'Ho Chi Minh City', 'Asia/Kolkata'].forEach(query => {
      expect(filterTimezoneOptions(options, query, t).length, query).toBeGreaterThan(0);
    });
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

describe('overview world clock configuration', () => {
  it('uses an empty selection by default and retains only two distinct valid timezones', () => {
    expect(normalizeOverviewWorldClockConfig(null)).toEqual(DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG);
    expect(normalizeOverviewWorldClockConfig({ firstTimezone: 'invalid', secondTimezone: 'invalid' }))
      .toEqual(DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG);
    expect(normalizeOverviewWorldClockConfig({ timezones: ['Europe/London', 'Europe/London', 'Asia/Tokyo'] }))
      .toEqual({ timezones: ['Europe/London', 'Asia/Tokyo'] });
    expect(normalizeOverviewWorldClockConfig({ firstTimezone: 'Europe/London', secondTimezone: 'Asia/Tokyo' }))
      .toEqual({ timezones: ['Europe/London', 'Asia/Tokyo'] });
  });
});

describe('world clock translation and time', () => {
  it('renders the entire picker with translated city labels', async () => {
    await i18n.changeLanguage('zh-CN');
    const options = getAllTimezoneOptions();
    const markup = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCityPicker, {
      visible: true, existingTimezones: [], options, onSelect: vi.fn(), onClose: vi.fn(), onRemove: vi.fn(), onRemoveHover: vi.fn(),
    })));
    expect(markup).toContain('北京');
    expect(markup).toContain('开普敦');
    expect(markup).toContain('/cn.svg');
    expect(markup).toContain('/za.svg');
    expect(markup.match(/loading="lazy"/g)).toHaveLength(options.filter(option => option.countryCode).length);
    expect(markup.match(/class="world-clock-picker-item"/g)).toHaveLength(options.length);
  });

  it('renders a saved card in the active language after a language switch', async () => {
    const tick = buildTick(DEFAULT_CITIES[0], new Date('2026-01-01T00:00:00Z'), 'UTC', 'en-US');
    await i18n.changeLanguage('en-US');
    const english = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, { tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: false })));
    expect(english).toContain('Shanghai');
    expect(english).toContain('/cn.svg');
    await i18n.changeLanguage('zh-CN');
    const chinese = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, { tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: false })));
    expect(chinese).toContain('上海');
  });

  it('offers an enabled delete button for an added timezone matched through an alias', async () => {
    await i18n.changeLanguage('en-US');
    const options = [{ timezone: 'Asia/Calcutta', label: 'Kolkata', labelKey: 'maxExpand.worldClock.timezoneLabels.Asia_Calcutta' }];
    const markup = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCityPicker, {
      visible: true, existingTimezones: ['Asia/Kolkata'], options, onSelect: vi.fn(), onClose: vi.fn(),
      onRemove: vi.fn(), onRemoveHover: vi.fn(),
    })));
    expect(markup).toContain('world-clock-picker-item--added');
    expect(markup).toMatch(/<button class="world-clock-picker-select"[^>]*disabled=""/);
    const removeButton = markup.match(/<button class="world-clock-picker-remove"[^>]*>/)?.[0];
    expect(removeButton).toBeDefined();
    expect(removeButton).not.toContain('disabled');
    expect(removeButton).toContain('Kolkata');
    expect(markup).not.toContain('world-clock-picker-item-badge');
    expect(markup).toMatch(/<\/button><button class="world-clock-picker-remove"/);
  });

  it('renders the shared delete highlight on the targeted card', () => {
    const tick = buildTick(DEFAULT_CITIES[0], new Date(), 'UTC');
    const highlighted = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, {
      tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: false, removeHighlighted: true,
    })));
    const normal = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, {
      tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: false, removeHighlighted: false,
    })));
    expect(highlighted).toContain('world-clock-card--remove-highlighted');
    expect(normal).not.toContain('world-clock-card--remove-highlighted');
  });

  it('places the card delete button after the analog dial', () => {
    const tick = buildTick(DEFAULT_CITIES[0], new Date(), 'UTC');
    const markup = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCard, {
      tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: false,
    })));
    expect(markup.indexOf('world-clock-card-dial')).toBeLessThan(markup.indexOf('world-clock-card-remove'));
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
    [
      ['Asia/Shanghai', 'cn'], ['Europe/London', 'gb'], ['America/New_York', 'us'],
      ['Asia/Calcutta', 'in'], ['Europe/Kiev', 'ua'], ['Pacific/Truk', 'fm'],
      ['America/Godthab', 'gl'], ['Antarctica/Casey', 'aq'],
    ].forEach(([timezone, countryCode]) => expect(getTimezoneCountryCode(timezone)).toBe(countryCode));
    expect(getTimezoneCountryCode('UTC')).toBeUndefined();
  });

  it('treats modern and legacy IANA names as the same timezone', () => {
    [['Asia/Kolkata', 'Asia/Calcutta'], ['Asia/Kathmandu', 'Asia/Katmandu'], ['Europe/Kyiv', 'Europe/Kiev']].forEach(([modern, legacy]) => {
      expect(getCanonicalTimezone(modern)).toBe(getCanonicalTimezone(legacy));
      expect(buildTick({ timezone: modern, label: modern, order: 0 }, new Date(), legacy).isLocal).toBe(true);
    });
  });

  it('restores the original complete date and time, including seconds and fractional offsets', () => {
    const now = new Date('2026-01-01T00:00:17Z');
    [['Asia/Kolkata', '5:30:17 AM'], ['Asia/Kathmandu', '5:45:17 AM'], ['Pacific/Chatham', '1:45:17 PM'], ['UTC', '12:00:17 AM']].forEach(([timezone, expected]) => {
      const tick = buildTick({ timezone, label: timezone, order: 0 }, now, 'UTC', 'zh-CN');
      expect(tick.formattedTime).toBe(getWorldClockTime(timezone, timezone, now).formattedTime);
      expect(tick.formattedTime).toContain('Jan 1, 2026');
      expect(tick.formattedTime).toContain(expected);
      expect(tick.formattedDate).toBe(new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, month: 'numeric', day: 'numeric' }).format(now));
    });
  });

  it('uses seasonal timezone rules and does not reorder the stored city array', () => {
    const city = { timezone: 'America/New_York', label: 'New York', order: 0 };
    expect(buildTick(city, new Date('2026-01-01T12:00:00Z'), 'UTC', 'en-US').formattedTime).toContain('7:00:00 AM');
    expect(buildTick(city, new Date('2026-07-01T12:00:00Z'), 'UTC', 'en-US').formattedTime).toContain('8:00:00 AM');
    const cities = [{ timezone: 'UTC', label: 'UTC', order: 1 }, city];
    expect(buildAllTicks(cities, 'UTC')[0].timezone).toBe(city.timezone);
    expect(cities[0].timezone).toBe('UTC');
  });

  it.each([
    ['Asia/Kolkata', '2026-01-01T00:00:30Z', 165.25, 183, 180],
    ['Asia/Kathmandu', '2026-01-01T00:00:30Z', 172.75, 273, 180],
    ['Pacific/Chatham', '2026-01-01T00:00:30Z', 52.75, 273, 180],
    ['America/St_Johns', '2026-01-01T00:00:30Z', 255.25, 183, 180],
    ['UTC', '2026-01-01T23:59:59Z', 359.9916666667, 359.9, 354],
    ['UTC', '2026-01-02T00:00:00Z', 0, 0, 0],
    ['America/New_York', '2026-03-08T06:59:59Z', 59.9916666667, 359.9, 354],
    ['America/New_York', '2026-03-08T07:00:00Z', 90, 0, 0],
  ])('keeps analog hands in sync for %s at %s', (timezone, timestamp, hour, minute, second) => {
    const tick = buildTick({ timezone, label: timezone, order: 0 }, new Date(timestamp), 'UTC');
    expect(tick.handAngles.hour).toBeCloseTo(hour, 6);
    expect(tick.handAngles.minute).toBeCloseTo(minute, 6);
    expect(tick.handAngles.second).toBe(second);
  });
});

describe('world clock rendering performance', () => {
  it('does not mount the city rows or flags while the picker is closed', () => {
    const markup = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(WorldClockCityPicker, {
      visible: false, existingTimezones: [], options: getAllTimezoneOptions(), onSelect: vi.fn(), onClose: vi.fn(),
      onRemove: vi.fn(), onRemoveHover: vi.fn(),
    })));
    expect(markup).not.toContain('world-clock-picker-item');
    expect(markup).not.toContain('world-clock-country-flag');
    expect(markup).toContain('world-clock-picker-sidebar');
  });

  it('reuses timezone resolution across clock updates and repeated city searches', () => {
    const timezone = 'Etc/GMT+7';
    const canonical = getCanonicalTimezone(timezone);
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    for (let index = 0; index < 100; index += 1) expect(getCanonicalTimezone(timezone)).toBe(canonical);
    expect(formatter).not.toHaveBeenCalled();
  });
});
