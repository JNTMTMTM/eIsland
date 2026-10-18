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
 * @file PerformanceMetricGrid.tsx
 * @description Overview 性能监控指标网格，供实时小组件与设置页静态预览共用。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import {
  PERFORMANCE_MONITOR_METRIC_KEYS,
  type PerformanceMonitorChartColors,
  type PerformanceMonitorMetricKey,
} from '../../../../../../utils/performanceMonitorColors';
import type { ReactElement } from 'react';

/** 单项指标的取整展示值，不可用时为 null。 */
interface PerformanceMetricValue {
  percent: number | null;
  temperature: number | null;
}

/** 小组件展示的 CPU/GPU/内存/磁盘四项指标。 */
export type PerformanceWidgetMetrics = Record<PerformanceMonitorMetricKey, PerformanceMetricValue>;

interface PerformanceMetricGridProps {
  metrics: PerformanceWidgetMetrics;
  colors: PerformanceMonitorChartColors;
}

const METRIC_LABEL_KEYS: Record<PerformanceMonitorMetricKey, string> = {
  cpu: 'expanded.performanceMonitor.labels.cpu',
  gpu: 'expanded.performanceMonitor.labels.gpu',
  memory: 'expanded.performanceMonitor.labels.memory',
  disk: 'expanded.performanceMonitor.labels.disk',
};

/**
 * 渲染性能指标 2×2 网格。
 * @param props - 网格属性
 * @param props.metrics - 四项指标的取整展示值
 * @param props.colors - 各指标进度条颜色
 * @returns 性能指标网格
 */
export function PerformanceMetricGrid({ metrics, colors }: PerformanceMetricGridProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="ov-dash-performance-grid">
      {PERFORMANCE_MONITOR_METRIC_KEYS.map((key) => {
        const { percent, temperature } = metrics[key];
        return (
          <div key={key} className="ov-dash-performance-item">
            <div className="ov-dash-performance-head">
              <span className="ov-dash-performance-label">{t(METRIC_LABEL_KEYS[key])}</span>
              {temperature !== null && <span className="ov-dash-performance-temp">{`${temperature}℃`}</span>}
              <span className="ov-dash-performance-value">{percent === null ? '--' : `${percent}%`}</span>
            </div>
            <div className="ov-dash-performance-track">
              {/* scaleX 只触发合成层更新，避免每次刷新进度条都重排。 */}
              <div className="ov-dash-performance-fill" style={{ background: colors[key], transform: `scaleX(${(percent ?? 0) / 100})` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
