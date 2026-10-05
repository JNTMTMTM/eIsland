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
 * @file country-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { COUNTRY_ALIASES, CountryIcon, resolveCountryCode, resolveCountryIcon } from '../country-icon';

describe('resolveCountryCode', () => {
  it('returns empty string for empty input', () => {
    expect(resolveCountryCode('')).toBe('');
  });

  it('resolves known aliases to canonical codes', () => {
    expect(resolveCountryCode('cn')).toBe('CHN');
    expect(resolveCountryCode('us')).toBe('USA');
    expect(resolveCountryCode('jp')).toBe('JP');
    expect(resolveCountryCode('kr')).toBe('KR');
    expect(resolveCountryCode('fr')).toBe('FR');
    expect(resolveCountryCode('de')).toBe('DE');
    expect(resolveCountryCode('es')).toBe('ES');
    expect(resolveCountryCode('ru')).toBe('RU');
  });

  it('resolves locale-style aliases', () => {
    expect(resolveCountryCode('zh-cn')).toBe('CHN');
    expect(resolveCountryCode('zh-tw')).toBe('CHN');
    expect(resolveCountryCode('en-us')).toBe('USA');
    expect(resolveCountryCode('ja-JP')).toBe('JP');
  });

  it('resolves full name aliases', () => {
    expect(resolveCountryCode('china')).toBe('CHN');
    expect(resolveCountryCode('usa')).toBe('USA');
    expect(resolveCountryCode('japan')).toBe('JP');
    expect(resolveCountryCode('korea')).toBe('KR');
    expect(resolveCountryCode('france')).toBe('FR');
    expect(resolveCountryCode('germany')).toBe('DE');
    expect(resolveCountryCode('spain')).toBe('ES');
    expect(resolveCountryCode('russia')).toBe('RU');
  });

  it('is case-insensitive for aliases', () => {
    expect(resolveCountryCode('CN')).toBe('CHN');
    expect(resolveCountryCode('En-Us')).toBe('USA');
  });

  it('returns uppercase original for unknown codes', () => {
    expect(resolveCountryCode('zz')).toBe('ZZ');
    expect(resolveCountryCode('unknown')).toBe('UNKNOWN');
  });
});

describe('resolveCountryIcon', () => {
  it('returns SVG path for known country codes', () => {
    expect(resolveCountryIcon('cn')).toBe('../svg/countries/CHN.svg');
    expect(resolveCountryIcon('us')).toBe('../svg/countries/USA.svg');
    expect(resolveCountryIcon('jp')).toBe('../svg/countries/JP.svg');
    expect(resolveCountryIcon('ja-JP')).toBe('../svg/countries/JP.svg');
    expect(resolveCountryIcon('kr')).toBe('../svg/countries/KR.svg');
    expect(resolveCountryIcon('fr')).toBe('../svg/countries/FR.svg');
    expect(resolveCountryIcon('de')).toBe('../svg/countries/DE.svg');
    expect(resolveCountryIcon('es')).toBe('../svg/countries/ES.svg');
    expect(resolveCountryIcon('ru')).toBe('../svg/countries/RU.svg');
  });

  it('returns undefined for unknown country codes', () => {
    expect(resolveCountryIcon('zz')).toBeUndefined();
    expect(resolveCountryIcon('unknown')).toBeUndefined();
  });
});

describe('COUNTRY_ALIASES', () => {
  it('has expected mappings', () => {
    expect(COUNTRY_ALIASES['cn']).toBe('CHN');
    expect(COUNTRY_ALIASES['china']).toBe('CHN');
    expect(COUNTRY_ALIASES['zh']).toBe('CHN');
    expect(COUNTRY_ALIASES['zh-cn']).toBe('CHN');
    expect(COUNTRY_ALIASES['zh-tw']).toBe('CHN');
    expect(COUNTRY_ALIASES['us']).toBe('USA');
    expect(COUNTRY_ALIASES['usa']).toBe('USA');
    expect(COUNTRY_ALIASES['en']).toBe('USA');
    expect(COUNTRY_ALIASES['en-us']).toBe('USA');
    expect(COUNTRY_ALIASES['jp']).toBe('JP');
    expect(COUNTRY_ALIASES['kr']).toBe('KR');
    expect(COUNTRY_ALIASES['fr']).toBe('FR');
    expect(COUNTRY_ALIASES['de']).toBe('DE');
    expect(COUNTRY_ALIASES['es']).toBe('ES');
    expect(COUNTRY_ALIASES['ru']).toBe('RU');
  });
});

describe('CountryIcon', () => {
  it('has expected keys', () => {
    expect(CountryIcon).toHaveProperty('CHN');
    expect(CountryIcon).toHaveProperty('USA');
    expect(CountryIcon).toHaveProperty('JP');
    expect(CountryIcon).toHaveProperty('KR');
    expect(CountryIcon).toHaveProperty('FR');
    expect(CountryIcon).toHaveProperty('DE');
    expect(CountryIcon).toHaveProperty('ES');
    expect(CountryIcon).toHaveProperty('RU');
  });

  it('maps keys to SVG paths', () => {
    expect(CountryIcon.CHN).toBe('../svg/countries/CHN.svg');
    expect(CountryIcon.USA).toBe('../svg/countries/USA.svg');
    expect(CountryIcon.JP).toBe('../svg/countries/JP.svg');
    expect(CountryIcon.KR).toBe('../svg/countries/KR.svg');
    expect(CountryIcon.FR).toBe('../svg/countries/FR.svg');
    expect(CountryIcon.DE).toBe('../svg/countries/DE.svg');
    expect(CountryIcon.ES).toBe('../svg/countries/ES.svg');
    expect(CountryIcon.RU).toBe('../svg/countries/RU.svg');
  });
});
