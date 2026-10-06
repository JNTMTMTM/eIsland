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
 * @file index.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { abbreviateWeatherDescription } from '../index';

describe('abbreviateWeatherDescription', () => {
  it('returns empty string for blank input', () => {
    expect(abbreviateWeatherDescription('  ')).toBe('');
  });

  it('maps weather by keyword with fallback text', () => {
    expect(abbreviateWeatherDescription('Heavy rain')).toBe('暴雨');
    expect(abbreviateWeatherDescription('多云转晴')).toBe('多云');
  });

  it('uses i18n translator when provided', () => {
    const t = vi.fn((key: string, options?: Record<string, unknown>) => {
      const defaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : '';
      return `${key}:${defaultValue}`;
    });
    const result = abbreviateWeatherDescription('Thunderstorm', t);

    expect(result).toBe('weatherAbbr.thunder:雷雨');
    expect(t).toHaveBeenCalledWith('weatherAbbr.thunder', { defaultValue: '雷雨' });
  });

  it('keeps original text when no mapping matched', () => {
    expect(abbreviateWeatherDescription('Alien Weather')).toBe('Alien Weather');
  });
});
