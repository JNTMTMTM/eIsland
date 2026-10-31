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
 * @file MetricCard.tsx
 * @description Expanded 性能监控 Tab 的单项仪表卡片：环形占用率、温度、明细与进度条。
 * @author 鸡哥
 */

import { clampPercent } from '../utils/performanceMonitorUtils';
import type { ReactElement } from 'react';
import type { MetricCardProps } from '../types/performanceMonitorTypes';

/**
 * 渲染单项仪表卡片。
 * @param props - 组件入参
 * @param props.label - 指标名称
 * @param props.value - 占用率
 * @param props.valueText - 环形中心文本
 * @param props.detail - 明细文本
 * @param props.temperature - 温度或附加信息
 * @param props.accent - 图表颜色
 * @returns 仪表卡片
 */
export function MetricCard({ label, value, valueText, detail, temperature, accent }: MetricCardProps): ReactElement {
  const percent = clampPercent(value);
  return (
    <div className="pm-metric-card">
      <div
        className="pm-meter-ring"
        style={{ background: `conic-gradient(${accent} ${percent * 3.6}deg, rgba(var(--color-text-rgb), 0.1) 0deg)` }}
      >
        <div className="pm-meter-core">{valueText}</div>
      </div>
      <div className="pm-metric-body">
        <div className="pm-metric-head">
          <span className="pm-metric-label">{label}</span>
          <span className="pm-metric-temp">{temperature}</span>
        </div>
        <div className="pm-metric-detail">{detail}</div>
        <div className="pm-progress-track">
          <div className="pm-progress-fill" style={{ width: `${percent}%`, background: accent }} />
        </div>
      </div>
    </div>
  );
}
