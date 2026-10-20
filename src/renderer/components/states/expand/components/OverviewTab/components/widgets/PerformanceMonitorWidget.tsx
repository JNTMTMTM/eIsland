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
 * @file PerformanceMonitorWidget.tsx
 * @description Overview 性能监控小组件，展开时自动轮询 CPU/GPU/内存/磁盘占用与温度。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import {
  DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS,
  DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION,
  PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY,
  PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY,
  PERFORMANCE_MONITOR_METRIC_KEYS,
  normalizePerformanceMonitorChartColors,
  normalizePerformanceMonitorHardwareSelection,
  type PerformanceMonitorChartColors,
  type PerformanceMonitorHardwareSelection,
} from '../../../../../../../utils/performanceMonitorColors';
import { PerformanceMetricGrid, PerformanceMetricSkeleton, type PerformanceWidgetMetrics } from '../PerformanceMetricGrid';

/* eslint @typescript-eslint/no-floating-promises: ["error", { "ignoreVoid": true }] -- effect 和计时器显式启动内部已处理失败的异步采集。 */

type PerformanceSnapshot = Awaited<ReturnType<Window['api']['getPerformanceSnapshot']>>;

/** 与性能监控 Tab 保持相同节奏，对齐主进程 CPU 增量与温度缓存的刷新周期。 */
const REFRESH_INTERVAL_MS = 2000;
/** 首次采集推迟到展开动画之后，避免与窗口过渡争抢主线程。 */
const START_FETCH_DELAY_MS = 200;
/** 跨挂载保留最近一次指标，重新展开时直接显示而不是加载态。 */
let cachedMetrics: PerformanceWidgetMetrics | null = null;

function roundPercent(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.max(0, Math.min(100, value)));
}

function roundTemperature(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function summarizeSnapshot(snapshot: PerformanceSnapshot): PerformanceWidgetMetrics {
  return {
    cpu: { percent: roundPercent(snapshot.cpu.loadPercent), temperature: roundTemperature(snapshot.cpu.temperatureCelsius) },
    gpu: { percent: roundPercent(snapshot.gpu?.loadPercent), temperature: roundTemperature(snapshot.gpu?.temperatureCelsius) },
    memory: { percent: roundPercent(snapshot.memory.usagePercent), temperature: null },
    disk: { percent: roundPercent(snapshot.disk.usagePercent), temperature: roundTemperature(snapshot.disk.temperatureCelsius) },
  };
}

function isSameMetrics(previous: PerformanceWidgetMetrics, next: PerformanceWidgetMetrics): boolean {
  return PERFORMANCE_MONITOR_METRIC_KEYS.every((key) => (
    previous[key].percent === next[key].percent && previous[key].temperature === next[key].temperature
  ));
}

/**
 * 渲染 Overview 性能监控小组件。
 * @description 复用主进程原生性能插件快照，仅在小组件挂载且窗口可见时轮询；点击标题切换到 Expand 性能监控页。
 * @returns 性能监控小组件
 */
export function PerformanceMonitorWidget(): ReactElement {
  const { t } = useTranslation();
  const setExpandTab = useIslandStore((store) => store.setExpandTab);
  const [metrics, setMetrics] = useState<PerformanceWidgetMetrics | null>(() => cachedMetrics);
  const [failed, setFailed] = useState(false);
  const [chartColors, setChartColors] = useState<PerformanceMonitorChartColors>(DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS);
  const [hardwareSelection, setHardwareSelection] = useState<PerformanceMonitorHardwareSelection>(DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION);

  useEffect(() => {
    let cancelled = false;
    const updatedSettings = new Set<string>();
    const readSetting = async (key: string, apply: (value: unknown) => void): Promise<void> => {
      try {
        const value = await window.api.storeRead(key);
        if (!cancelled && !updatedSettings.has(key)) apply(value);
      } catch {
        // 读取失败时保留默认配置。
      }
    };
    void readSetting(PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY, (value) => {
      setChartColors(normalizePerformanceMonitorChartColors(value));
    });
    void readSetting(PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY, (value) => {
      setHardwareSelection(normalizePerformanceMonitorHardwareSelection(value));
    });
    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`) {
        updatedSettings.add(PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY);
        setChartColors(normalizePerformanceMonitorChartColors(value));
      }
      if (channel === `store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`) {
        updatedSettings.add(PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY);
        setHardwareSelection(normalizePerformanceMonitorHardwareSelection(value));
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalTimer: number | undefined;
    let inFlight = false;
    const loadSnapshot = async (): Promise<void> => {
      // 上一次采集未返回时跳过本轮，避免主进程慢查询时请求堆积。
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const snapshot = await window.api.getPerformanceSnapshot(hardwareSelection, false);
        if (cancelled) return;
        const next = summarizeSnapshot(snapshot);
        cachedMetrics = next;
        // 取整后无变化时沿用旧对象，React 会跳过本次渲染。
        setMetrics((previous) => (previous && isSameMetrics(previous, next) ? previous : next));
        setFailed(false);
      } catch {
        if (!cancelled) {
          cachedMetrics = null;
          setMetrics(null);
          setFailed(true);
        }
      } finally {
        inFlight = false;
      }
    };
    const startPolling = (): void => {
      if (cancelled || intervalTimer !== undefined) return;
      void loadSnapshot();
      intervalTimer = window.setInterval(() => { void loadSnapshot(); }, REFRESH_INTERVAL_MS);
    };
    const stopPolling = (): void => {
      if (intervalTimer === undefined) return;
      window.clearInterval(intervalTimer);
      intervalTimer = undefined;
    };
    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };
    const delayTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, START_FETCH_DELAY_MS);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearTimeout(delayTimer);
      stopPolling();
    };
  }, [hardwareSelection]);

  const openPerformanceMonitorTab = useCallback((): void => {
    setExpandTab('performanceMonitor');
  }, [setExpandTab]);

  const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLSpanElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPerformanceMonitorTab();
  }, [openPerformanceMonitorTab]);

  const renderBody = (): ReactElement => {
    if (metrics) return <PerformanceMetricGrid metrics={metrics} colors={chartColors} />;
    if (failed) return <div className="ov-dash-performance-empty">{t('expanded.performanceMonitor.error')}</div>;
    return <PerformanceMetricSkeleton />;
  };

  return (
    <div className="ov-dash-widget ov-dash-performance-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link"
          role="button"
          tabIndex={0}
          onClick={openPerformanceMonitorTab}
          onKeyDown={handleTitleKeyDown}
        >
          {t('overview.performanceMonitor.title')}
        </span>
      </div>
      {renderBody()}
    </div>
  );
}
