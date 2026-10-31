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
 * @file usePerformanceMonitorTab.ts
 * @description Expanded 性能监控 Tab 的采集开关、可见性轮询、图表配置同步与设置页跳转。
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from 'react';
import useIslandStore from '../../../../../../store/slices';
import {
  DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS,
  DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION,
  PERFORMANCE_MONITOR_CHART_COLORS_STORE_KEY,
  PERFORMANCE_MONITOR_HARDWARE_SELECTION_STORE_KEY,
  type PerformanceMonitorChartColors,
  type PerformanceMonitorHardwareSelection,
  normalizePerformanceMonitorChartColors,
  normalizePerformanceMonitorHardwareSelection,
} from '../../../../../../utils/performanceMonitorColors';
import {
  EXPAND_NAV_LAYOUT_STORE_KEY,
  LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY,
  REFRESH_INTERVAL_MS,
  SETTINGS_OPEN_TAB_STORE_KEY,
  STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY,
  STANDALONE_WINDOW_MODE_STORE_KEY,
  START_FETCH_DELAY_MS,
} from '../config/performanceMonitorConfig';
import { normalizeHiddenLayout } from '../utils/performanceMonitorUtils';
import type { PerformanceSnapshot, UsePerformanceMonitorTabReturn } from '../types/performanceMonitorTypes';

/** 跨挂载保留最近一次快照，重新展开时直接显示而不是加载态。 */
let cachedPerformanceSnapshot: PerformanceSnapshot | null = null;
/** 本次会话内用户已开始过监控时，再次进入自动恢复采集。 */
let hasStartedMonitoringThisSession = false;

/**
 * 管理性能监控采集与页面操作。
 * @returns 快照、采集状态、图表颜色与操作回调
 */
export function usePerformanceMonitorTab(): UsePerformanceMonitorTabReturn {
  const { setMaxExpand, setMaxExpandTab } = useIslandStore(useShallow((store) => ({
    setMaxExpand: store.setMaxExpand,
    setMaxExpandTab: store.setMaxExpandTab,
  })));
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

  /**
   * 打开设置指定分页：独立窗口模式切到独立窗口，否则进入灵动岛 MaxExpand 设置。
   * @param page - 设置分页标识
   */
  const openSettingsPage = (page: string): void => {
    void window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, page)
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
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: page }));
        setMaxExpandTab('settings');
        setMaxExpand();
        return undefined;
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: page }));
        setMaxExpandTab('settings');
        setMaxExpand();
      });
  };

  const handleHidePage = (): void => {
    stopMonitoring();
    hidePerformanceMonitorInExpandLayout();
    openSettingsPage('expand-layout');
  };

  const openHardwareSettings = (): void => {
    openSettingsPage('performance-monitor');
  };

  return {
    snapshot,
    monitoringEnabled,
    failed,
    chartColors,
    startMonitoring,
    stopMonitoring,
    handleHidePage,
    openHardwareSettings,
  };
}
