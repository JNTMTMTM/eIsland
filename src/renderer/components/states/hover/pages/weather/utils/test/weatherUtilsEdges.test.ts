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
 * @file weatherUtilsEdges.test.ts
 * @description 天气显示工具的后天天标签、负值缺省与零值边界测试。
 * @author 鸡哥
 */

import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import { formatPrecipitationText, formatWindText, getWeekLabel, getWeatherIconPath, getWeatherSmallIconPath } from '../weatherUtils';

const i18n = createInstance();
await i18n.init({ lng: 'zh-CN', resources: {}, fallbackLng: false });

describe('天气工具公开参数边界', () => {
  it('明天和后天分别使用对应标签', () => {
    expect(getWeekLabel(0, i18n.t)).toBe('明天');
    expect(getWeekLabel(1, i18n.t)).toBe('后天');
  });
  it('无降水数据使用缺省文本且零概率合法', () => {
    expect(formatPrecipitationText(-1, i18n.t)).toBe(' N/A');
    expect(formatPrecipitationText(0, i18n.t)).toBe('0%');
  });
  it('图标路径保留昼夜后缀及大小尺寸', () => {
    expect(getWeatherIconPath(100, true)).toBe('../icon/100d_big.png');
    expect(getWeatherIconPath(100, false)).toBe('../icon/100n_big.png');
    expect(getWeatherSmallIconPath(100, true)).toBe('../icon/100d.png');
    expect(getWeatherSmallIconPath(100, false)).toBe('../icon/100n.png');
  });
  it('无风速数据使用缺省文本且零风速合法', () => {
    expect(formatWindText(-1, i18n.t)).toBe(' N/A');
    expect(formatWindText(0, i18n.t)).toBe('0m/s');
  });
});
