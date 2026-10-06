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
 * @file PerformanceMonitorTab.tsx
 * @description Expanded 性能监控 Tab
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import {
  DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS,
  DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION,
  PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY,
  PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY,
  type PerformanceMonitorChartColors,
  type PerformanceMonitorHardwareOptions,
  type PerformanceMonitorHardwareSelection,
  normalizePerformanceMonitorChartColors,
  normalizePerformanceMonitorHardwareSelection,
} from '../../../../utils/performanceMonitorColors';

const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';
const STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';
const EXPAND_NAV_LAYOUT_STORE_KEY = 'expand-nav-layout';

interface PerformanceSnapshot {
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

interface MetricCardProps {
  label: string;
  value: number | null;
  valueText: string;
  detail: string;
  temperature: string;
  accent: string;
}

const REFRESH_INTERVAL_MS = 2000;
const START_FETCH_DELAY_MS = 200;
let cachedPerformanceSnapshot: PerformanceSnapshot | null = null;
let hasStartedMonitoringThisSession = false;

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${Math.round(clampPercent(value))}%`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatTemp(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '--';
  return `${Math.round(value)}℃`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function MetricCard({ label, value, valueText, detail, temperature, accent }: MetricCardProps): React.ReactElement {
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

/**
 * 性能监控 Tab
 * @description 展开状态下展示 CPU/GPU/内存/磁盘 4 个仪表盘
 */
export function PerformanceMonitorTab(): React.ReactElement {
  const { t } = useTranslation();
  const { setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(() => cachedPerformanceSnapshot);
  const [monitoringEnabled, setMonitoringEnabled] = useState<boolean>(() => hasStartedMonitoringThisSession);
  const [failed, setFailed] = useState(false);
  const [chartColors, setChartColors] = useState<PerformanceMonitorChartColors>(DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS);
  const [hardwareSelection, setHardwareSelection] = useState<PerformanceMonitorHardwareSelection>(DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION);
  const snapshotRef = useRef<PerformanceSnapshot | null>(snapshot);
  const cancelMonitoringRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
    if (snapshot) cachedPerformanceSnapshot = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!monitoringEnabled) return;
    let cancelled = false;
    // 停止按钮在被动 Effect 清理前也必须使本轮异步采集失效。
    cancelMonitoringRef.current = () => { cancelled = true; };
    let delayTimer: number | undefined;
    let intervalTimer: number | undefined;
    let inFlight = false;
    const loadSnapshot = (): void => {
      if (cancelled || inFlight) return;
      inFlight = true;
      window.api.getPerformanceSnapshot(hardwareSelection, false)
        .then((data) => {
          if (cancelled) return;
          const nextSnapshot = data as PerformanceSnapshot;
          cachedPerformanceSnapshot = nextSnapshot;
          setSnapshot(nextSnapshot);
          setFailed(false);
        })
        .catch(() => {
          if (cancelled) return;
          setFailed(true);
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const startPolling = (): void => {
      if (cancelled || intervalTimer !== undefined) return;
      loadSnapshot();
      intervalTimer = window.setInterval(loadSnapshot, REFRESH_INTERVAL_MS);
    };
    const stopPolling = (): void => {
      if (intervalTimer !== undefined) {
        window.clearInterval(intervalTimer);
        intervalTimer = undefined;
      }
    };
    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };
    delayTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, START_FETCH_DELAY_MS);
    return () => {
      cancelled = true;
      if (snapshotRef.current) cachedPerformanceSnapshot = snapshotRef.current;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      stopPolling();
    };
  }, [hardwareSelection, monitoringEnabled]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY).then((value) => {
      if (cancelled) return;
      setChartColors(normalizePerformanceMonitorChartColors(value));
    }).catch(() => {});
    window.api.storeRead(PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY).then((value) => {
      if (cancelled) return;
      setHardwareSelection(normalizePerformanceMonitorHardwareSelection(value));
    }).catch(() => {});
    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY}`) {
        setChartColors(normalizePerformanceMonitorChartColors(value));
      }
      if (channel === `store:${PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY}`) {
        setHardwareSelection(normalizePerformanceMonitorHardwareSelection(value));
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const startMonitoring = (): void => {
    hasStartedMonitoringThisSession = true;
    setMonitoringEnabled(true);
    setFailed(false);
  };

  const stopMonitoring = (): void => {
    cancelMonitoringRef.current?.();
    snapshotRef.current = null;
    setMonitoringEnabled(false);
    setSnapshot(null);
    setFailed(false);
    cachedPerformanceSnapshot = null;
  };

  const hidePerformanceMonitorInExpandLayout = (): void => {
    const normalizeHiddenLayout = (value: unknown): Array<{ id: string; visible: boolean }> => {
      const defaults = ['overview', 'song', 'tools', 'performanceMonitor'].map((id) => ({
        id,
        visible: id !== 'performanceMonitor',
      }));
      if (!Array.isArray(value) || value.length === 0) return defaults;

      const known = new Set(defaults.map((item) => item.id));
      const merged = new Map<string, boolean>();
      value.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const candidate = item as { id?: unknown; visible?: unknown };
        if (typeof candidate.id !== 'string' || !known.has(candidate.id)) return;
        merged.set(candidate.id, candidate.visible !== false);
      });

      return defaults.map((item) => {
        if (item.id === 'overview') return { ...item, visible: true };
        if (item.id === 'performanceMonitor') return { ...item, visible: false };
        return {
          ...item,
          visible: merged.has(item.id) ? merged.get(item.id) === true : item.visible,
        };
      });
    };

    void window.api.storeRead(EXPAND_NAV_LAYOUT_STORE_KEY)
      .then((value) => {
        const nextLayout = normalizeHiddenLayout(value);
        return window.api.storeWrite(EXPAND_NAV_LAYOUT_STORE_KEY, nextLayout).then(() => nextLayout);
      })
      .then((nextLayout) => {
        window.api.settingsPreview(`store:${EXPAND_NAV_LAYOUT_STORE_KEY}`, nextLayout).catch(() => {});
        window.dispatchEvent(new CustomEvent('expand-nav-layout-changed', { detail: nextLayout }));
      })
      .catch(() => {});
  };

  const openExpandLayoutSettings = (): void => {
    void window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'expand-layout')
      .then(() => window.api.storeRead(STANDALONE_WINDOW_MODE_STORE_KEY))
      .then((mode) => {
        if (mode === 'standalone' || mode === 'integrated') return mode;
        return window.api.storeRead(LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY).catch(() => null);
      })
      .then((mode) => {
        if (mode === 'standalone') {
          return window.api.storeWrite(STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY, 'settings')
            .then(() => window.api.openStandaloneWindow())
            .catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'expand-layout' }));
        setMaxExpandTab('settings');
        setMaxExpand();
        return undefined;
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'expand-layout' }));
        setMaxExpandTab('settings');
        setMaxExpand();
      });
  };

  const handleHidePage = (): void => {
    stopMonitoring();
    hidePerformanceMonitorInExpandLayout();
    openExpandLayoutSettings();
  };

  if (!snapshot) {
    return (
      <div className="expand-tab-panel pm-tab-panel">
        <div className="pm-panel-wrap pm-panel-loading">
          <div className={`pm-loading${monitoringEnabled ? '' : ' pm-loading--idle'}`}>
            {monitoringEnabled && !failed && <span className="pm-loading-spinner" aria-hidden="true" />}
            <span className="pm-loading-text">
              {!monitoringEnabled
                ? t('expanded.performanceMonitor.startHint', { defaultValue: '首次进入请点击开始监控' })
                : failed
                  ? t('expanded.performanceMonitor.error', { defaultValue: '系统性能数据暂不可用' })
                  : t('expanded.performanceMonitor.loading', { defaultValue: '正在读取系统性能数据...' })}
            </span>
            {!monitoringEnabled && (
              <div className="pm-start-actions">
                <button className="pm-start-monitor-btn" type="button" onClick={startMonitoring}>
                  {t('expanded.performanceMonitor.startMonitor', { defaultValue: '开始监控' })}
                </button>
                <button className="pm-start-monitor-btn pm-start-monitor-btn--secondary" type="button" onClick={handleHidePage}>
                  {t('expanded.performanceMonitor.hidePage', { defaultValue: '隐藏本页面' })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const gpuName = snapshot.gpu
    ? [snapshot.gpu.vendor, snapshot.gpu.model].filter(Boolean).join(' ') || t('expanded.performanceMonitor.status.unavailable', { defaultValue: '不可用' })
    : t('expanded.performanceMonitor.status.noGpu', { defaultValue: '未检测到显卡' });
  const cpuName = [snapshot.cpu.manufacturer, snapshot.cpu.brand].filter(Boolean).join(' ') || t('expanded.performanceMonitor.status.unavailable', { defaultValue: '不可用' });
  const osText = `${snapshot.host.platform} ${snapshot.host.release} · ${snapshot.host.arch}`;
  const speedText = snapshot.cpu.speedGhz && snapshot.cpu.speedMaxGhz
    ? `${snapshot.cpu.speedGhz.toFixed(2)} / ${snapshot.cpu.speedMaxGhz.toFixed(2)} GHz`
    : snapshot.cpu.speedGhz
      ? `${snapshot.cpu.speedGhz.toFixed(2)} GHz`
      : '--';
  const metrics: MetricCardProps[] = [
    {
      label: t('expanded.performanceMonitor.labels.cpu', { defaultValue: 'CPU' }),
      value: snapshot.cpu.loadPercent,
      valueText: formatPercent(snapshot.cpu.loadPercent),
      detail: `${snapshot.cpu.physicalCores}P / ${snapshot.cpu.cores}T · ${speedText}`,
      temperature: formatTemp(snapshot.cpu.temperatureCelsius),
      accent: chartColors.cpu,
    },
    {
      label: t('expanded.performanceMonitor.labels.gpu', { defaultValue: 'GPU' }),
      value: snapshot.gpu?.loadPercent ?? null,
      valueText: formatPercent(snapshot.gpu?.loadPercent ?? null),
      detail: snapshot.gpu?.vramTotalMb ? `${Math.round(snapshot.gpu.vramTotalMb)} MB VRAM` : gpuName,
      temperature: formatTemp(snapshot.gpu?.temperatureCelsius ?? null),
      accent: chartColors.gpu,
    },
    {
      label: t('expanded.performanceMonitor.labels.memory', { defaultValue: '内存' }),
      value: snapshot.memory.usagePercent,
      valueText: formatPercent(snapshot.memory.usagePercent),
      detail: `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}`,
      temperature: t('expanded.performanceMonitor.labels.available', { defaultValue: '可用' }) + ` ${formatBytes(snapshot.memory.availableBytes)}`,
      accent: chartColors.memory,
    },
    {
      label: t('expanded.performanceMonitor.labels.disk', { defaultValue: '磁盘' }),
      value: snapshot.disk.usagePercent,
      valueText: formatPercent(snapshot.disk.usagePercent),
      detail: `${formatBytes(snapshot.disk.usedBytes)} / ${formatBytes(snapshot.disk.totalBytes)}`,
      temperature: formatTemp(snapshot.disk.temperatureCelsius),
      accent: chartColors.disk,
    },
  ];
  const infoItems = [
    { label: t('expanded.performanceMonitor.labels.host', { defaultValue: '主机' }), value: snapshot.host.hostname },
    { label: t('expanded.performanceMonitor.labels.os', { defaultValue: '系统' }), value: osText },
    { label: t('expanded.performanceMonitor.labels.cpuModel', { defaultValue: '处理器' }), value: cpuName },
    { label: t('expanded.performanceMonitor.labels.gpuModel', { defaultValue: '显卡' }), value: gpuName },
    { label: t('expanded.performanceMonitor.labels.uptime', { defaultValue: '运行' }), value: formatUptime(snapshot.host.uptimeSeconds) },
  ];

  const openHardwareSettings = (): void => {
    void window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'performance-monitor')
      .then(() => window.api.storeRead(STANDALONE_WINDOW_MODE_STORE_KEY))
      .then((mode) => {
        if (mode === 'standalone' || mode === 'integrated') return mode;
        return window.api.storeRead(LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY).catch(() => null);
      })
      .then((mode) => {
        if (mode === 'standalone') {
          return window.api.storeWrite(STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY, 'settings')
            .then(() => window.api.openStandaloneWindow())
            .catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'performance-monitor' }));
        setMaxExpandTab('settings');
        setMaxExpand();
        return undefined;
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'performance-monitor' }));
        setMaxExpandTab('settings');
        setMaxExpand();
      });
  };

  return (
    <div className="expand-tab-panel pm-tab-panel">
      <div className="pm-panel-wrap">
        <div className="pm-dashboard-head">
          <div className="pm-title-group">
            <span className="pm-title">{t('expanded.performanceMonitor.title', { defaultValue: '系统性能' })}</span>
            <div className="pm-subtitle-row">
              <span className="pm-subtitle">{t('expanded.performanceMonitor.subtitle', { defaultValue: '实时硬件状态与温度' })}</span>
              <button
                className={`pm-monitor-toggle-btn${monitoringEnabled ? ' pm-monitor-toggle-btn--stop' : ''}`}
                type="button"
                onClick={monitoringEnabled ? stopMonitoring : startMonitoring}
              >
                {monitoringEnabled
                  ? t('expanded.performanceMonitor.stopMonitor', { defaultValue: '停止监控' })
                  : t('expanded.performanceMonitor.startMonitor', { defaultValue: '开始监控' })}
              </button>
            </div>
          </div>
          <button className="pm-hardware-settings-link" type="button" onClick={openHardwareSettings}>
            {t('expanded.performanceMonitor.hardwareSettingsLink', { defaultValue: '和您的硬件不一样？点击前往调整' })}
          </button>
        </div>
        <div className="pm-dashboard-body">
          <div className="pm-info-panel">
            {infoItems.map((item) => (
              <div className="pm-info-row" key={item.label}>
                <span className="pm-info-label">{item.label}</span>
                <span className="pm-info-value">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="pm-metrics-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                valueText={metric.valueText}
                detail={metric.detail}
                temperature={metric.temperature}
                accent={metric.accent}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
