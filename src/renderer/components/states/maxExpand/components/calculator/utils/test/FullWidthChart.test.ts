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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file FullWidthChart.test.ts
 * @description 检查完整绘图区宽度下的坐标映射和缩放后尺寸重建。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { Chart, type FunctionPlotOptions } from 'function-plot';
import { FullWidthChart } from '../FullWidthChart';

it('maps both domain boundaries to the full width and preserves the visible domain after resizing', () => {
  const options: FunctionPlotOptions = {
    target: { querySelector: () => null } as unknown as HTMLElement,
    width: 300, height: 200,
    xAxis: { position: 'sticky', domain: [-10, 10] },
    yAxis: { position: 'sticky', domain: [-10, 10] },
  };
  const chart = new FullWidthChart(options);
  try {
    chart.internalVars();
    expect(chart.meta.xScale!(-10)).toBe(0);
    expect(chart.meta.xScale!(10)).toBe(300);
    expect(chart.meta.xScale!(0)).toBe(150);
    expect(chart.meta.yScale!(0) + chart.meta.margin!.top!).toBe(100);
    options.xAxis!.domain = [3, 7];
    options.width = 240;
    chart.internalVars();
    expect(chart.meta.xScale!.domain()).toEqual([3, 7]);
    expect(chart.meta.xScale!(3)).toBe(0);
    expect(chart.meta.xScale!(7)).toBe(240);
    expect(Chart.cache[options.id!]).toBe(chart);
  } finally {
    chart.removeAllListeners();
    Reflect.deleteProperty(Chart.cache, options.id!);
  }
});
