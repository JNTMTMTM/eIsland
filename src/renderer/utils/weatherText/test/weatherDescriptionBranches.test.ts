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
 * @file weatherDescriptionBranches.test.ts
 * @description 天气缩略描述的中英文关键词、优先级、空值与翻译回退测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { abbreviateWeatherDescription } from '../index';

describe('weather description keyword branches', () => {
  it.each([
    { description: '雷阵雨', expected: '雷雨' }, { description: 'thunder', expected: '雷雨' }, { description: 'storm', expected: '雷雨' },
    { description: '冰雹', expected: '冰雹' }, { description: '雹', expected: '冰雹' }, { description: 'hail', expected: '冰雹' },
    { description: '雨夹雪', expected: '雨夹雪' }, { description: 'sleet', expected: '雨夹雪' }, { description: 'wintry mix', expected: '雨夹雪' },
    { description: '冻雨', expected: '冻雨' }, { description: 'freezing rain', expected: '冻雨' },
    { description: '暴雪', expected: '降雪' }, { description: 'blizzard', expected: '降雪' }, { description: '小雪', expected: '降雪' }, { description: 'snow', expected: '降雪' },
    { description: '特大暴雨', expected: '暴雨' }, { description: '暴雨', expected: '暴雨' }, { description: 'torrential rain', expected: '暴雨' }, { description: 'heavy rain', expected: '暴雨' }, { description: 'downpour', expected: '暴雨' },
    { description: '阵雨', expected: '阵雨' }, { description: 'shower', expected: '阵雨' },
    { description: '毛毛雨', expected: '毛毛雨' }, { description: '细雨', expected: '毛毛雨' }, { description: 'drizzle', expected: '毛毛雨' },
    { description: '小雨', expected: '降雨' }, { description: 'rain', expected: '降雨' },
    { description: '沙尘暴', expected: '沙尘暴' }, { description: '扬沙', expected: '沙尘暴' }, { description: 'sandstorm', expected: '雷雨' }, { description: 'blowing sand', expected: '沙尘暴' },
    { description: '霾', expected: '霾' }, { description: 'haze', expected: '霾' }, { description: 'smog', expected: '霾' },
    { description: '雾', expected: '雾' }, { description: 'fog', expected: '雾' }, { description: 'mist', expected: '雾' }, { description: 'dust', expected: '雾' }, { description: 'sand', expected: '雾' },
    { description: '大风', expected: '大风' }, { description: '强风', expected: '大风' }, { description: 'wind', expected: '大风' }, { description: 'breeze', expected: '大风' }, { description: 'gale', expected: '大风' },
    { description: '高温', expected: '高温' }, { description: '炎热', expected: '高温' }, { description: 'hot', expected: '高温' },
    { description: '低温', expected: '低温' }, { description: '寒冷', expected: '低温' }, { description: 'cold', expected: '低温' }, { description: 'freezing', expected: '低温' },
    { description: '阴', expected: '阴天' }, { description: 'overcast', expected: '阴天' },
    { description: '多云', expected: '多云' }, { description: '云', expected: '多云' }, { description: 'cloud', expected: '多云' },
    { description: '晴', expected: '晴天' }, { description: 'sunny', expected: '晴天' }, { description: 'clear', expected: '晴天' },
    { description: '未知', expected: '未知' }, { description: 'unknown', expected: '未知' }, { description: 'n/a', expected: '未知' },
  ])('abbreviates $description as $expected', ({ description, expected }) => {
    expect(abbreviateWeatherDescription(description)).toBe(expected);
  });
  it('trims unknown prose, treats blank text as empty and forwards translation defaults', () => {
    expect(abbreviateWeatherDescription()).toBe('');
    expect(abbreviateWeatherDescription('  ')).toBe('');
    expect(abbreviateWeatherDescription('  unusual weather  ')).toBe('unusual weather');
    const translate = vi.fn().mockReturnValue('translated-sunny');
    expect(abbreviateWeatherDescription(' SUNNY ', translate)).toBe('translated-sunny');
    expect(translate).toHaveBeenCalledExactlyOnceWith('weatherAbbr.sunny', { defaultValue: '晴天' });
  });
});
