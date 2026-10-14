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
 * @file FullWidthChart.ts
 * @description 消除绘图库水平留白，让坐标绘图区与公式展示区同宽。
 * @author 鸡哥
 */

import { Chart } from 'function-plot';

/** 保持绘图库缩放与坐标映射，并让坐标绘图区使用完整宽度。 */
export class FullWidthChart extends Chart {
  /** 按完整宽度重新初始化坐标轴，保留上下刻度空间。 */
  override internalVars(): void {
    super.internalVars();
    const margin = this.meta.margin!;
    this.meta.width = this.meta.width! + margin.left! + margin.right!;
    margin.left = 0;
    margin.right = 0;
    this.initializeAxes();
  }

  /** 每次绘图和缩放时，将靠近边缘的刻度文字对齐到绘图区内部。 */
  override updateAxes(): void {
    super.updateAxes();
    const width = this.meta.width!;
    const scale = this.meta.xScale!;
    const canvas = this.canvas.merge(this.canvas.enter);
    canvas.selectAll('.x.axis .tick text').attr('text-anchor', function (this: SVGTextElement, value: number): string {
      const x = scale(value);
      const half = this.getComputedTextLength() / 2;
      return x <= half + 2 ? 'start' : x >= width - half - 2 ? 'end' : 'middle';
    });
    const axisX = Math.max(0, Math.min(width, scale(0)));
    canvas.selectAll('.y.axis .tick text').each(function (this: SVGTextElement): void {
      const inside = axisX < this.getComputedTextLength() + 3;
      this.setAttribute('text-anchor', inside ? 'start' : 'end');
      this.setAttribute('x', inside ? '3' : '-3');
    });
  }
}
