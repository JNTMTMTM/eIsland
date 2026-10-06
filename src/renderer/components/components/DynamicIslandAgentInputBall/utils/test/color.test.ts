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
 * @file color.test.ts
 * @description 液态玻璃球颜色转换、输入校验、RGB 限制及 uniform RGBA 槽位隔离测试。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { applyOrbColorsToUniforms, hexToRgbFloat, rgbFloatToHex } from '../color';
import { ORB_COLOR_A_OFFSET, ORB_COLOR_B_OFFSET } from '../../config/uniformDefaults';
describe('input ball color utilities', () => {
  it('known RGB primary and half-channel values round-trip with uppercase/lowercase or omitted hash', () => {
    expect(hexToRgbFloat('#FF0080')).toEqual([1, 0, 128 / 255]);
    expect(hexToRgbFloat('00ff00')).toEqual([0, 1, 0]);
    expect(rgbFloatToHex([1, 0, 128 / 255])).toBe('#ff0080');
  });
  it.each(['', '#fff', '#gg0000', '1234567', ' 000000'])('invalid hex %s becomes finite black', (value) => {
    expect(hexToRgbFloat(value)).toEqual([0, 0, 0]);
  });
  it('RGB bounds clamp and channels round to byte precision', () => {
    expect(rgbFloatToHex([-1, 0.5, 2])).toBe('#0080ff');
    expect(rgbFloatToHex([0, 0, 0])).toBe('#000000');
  });
  it('absent colors leave allocation to caller', () => {
    expect(applyOrbColorsToUniforms([1, 2])).toBeUndefined();
    expect(applyOrbColorsToUniforms([1, 2], null, '')).toBeUndefined();
  });
  it('two RGBA overrides clone seed and preserve all non-color channels', () => {
    const seed = Array.from({
      length: Math.max(ORB_COLOR_A_OFFSET, ORB_COLOR_B_OFFSET) + 8
    }, () => 0.25);
    const data = applyOrbColorsToUniforms(seed, '#ff0000', '#0000ff');
    expect(data?.slice(ORB_COLOR_A_OFFSET, ORB_COLOR_A_OFFSET + 4)).toEqual(new Float32Array([1, 0, 0, 1]));
    expect(data?.slice(ORB_COLOR_B_OFFSET, ORB_COLOR_B_OFFSET + 4)).toEqual(new Float32Array([0, 0, 1, 1]));
    expect(data?.[0]).toBe(0.25);
    expect(seed.every((value) => value === 0.25)).toBe(true);
  });
  it.each(['A', 'B'] as const)('only %s override keeps other color seed intact and invalid color finite', (channel) => {
    const seed = Array.from({
      length: Math.max(ORB_COLOR_A_OFFSET, ORB_COLOR_B_OFFSET) + 4
    }, () => 0.25);
    const data = applyOrbColorsToUniforms(seed, channel === 'A' ? 'invalid' : null, channel === 'B' ? 'invalid' : null);
    const changed = channel === 'A' ? ORB_COLOR_A_OFFSET : ORB_COLOR_B_OFFSET;
    const untouched = channel === 'A' ? ORB_COLOR_B_OFFSET : ORB_COLOR_A_OFFSET;
    expect(data?.slice(changed, changed + 4)).toEqual(new Float32Array([0, 0, 0, 1]));
    expect(data?.slice(untouched, untouched + 4)).toEqual(new Float32Array([0.25, 0.25, 0.25, 0.25]));
  });
});
