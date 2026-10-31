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
 * @file performanceMonitorTypes.ts
 * @description Expanded 性能监控 Tab 的原生快照、仪表卡片、信息行与 hook 返回值类型。
 * @author 鸡哥
 */

import type {
  PerformanceMonitorChartColors,
  PerformanceMonitorHardwareOptions,
} from '../../../../../../utils/performanceMonitorColors';

/** 翻译函数 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** 原生性能插件返回的快照 */
export interface PerformanceSnapshot {
  timestamp: number;
  host: {
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    uptimeSeconds: number;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speedGhz: number | null;
    speedMaxGhz: number | null;
    loadPercent: number;
    temperatureCelsius: number | null;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
  };
  gpu: {
    vendor: string;
    model: string;
    vramTotalMb: number | null;
    loadPercent: number | null;
    temperatureCelsius: number | null;
  } | null;
  disk: {
    totalBytes: number;
    usedBytes: number;
    usagePercent: number;
    temperatureCelsius: number | null;
  };
  hardwareOptions: PerformanceMonitorHardwareOptions;
}

/** MetricCard 组件入参 */
export interface MetricCardProps {
  label: string;
  value: number | null;
  valueText: string;
  detail: string;
  temperature: string;
  accent: string;
}

/** 主机信息行 */
export interface PerformanceInfoItem {
  label: string;
  value: string;
}

/** 由快照推导的仪表盘展示数据 */
export interface PerformanceDashboardView {
  metrics: MetricCardProps[];
  infoItems: PerformanceInfoItem[];
}

/** Expand 导航布局项 */
export interface ExpandNavLayoutItem {
  id: string;
  visible: boolean;
}

/** usePerformanceMonitorTab hook 返回值类型 */
export interface UsePerformanceMonitorTabReturn {
  snapshot: PerformanceSnapshot | null;
  monitoringEnabled: boolean;
  failed: boolean;
  chartColors: PerformanceMonitorChartColors;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  handleHidePage: () => void;
  openHardwareSettings: () => void;
}
