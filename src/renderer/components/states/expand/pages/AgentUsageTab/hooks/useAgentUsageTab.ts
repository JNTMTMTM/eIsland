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
 * @file useAgentUsageTab.ts
 * @description Expanded Agent 用量 Tab 的快照读取、手动刷新与可见期间轮询。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import { REFRESH_INTERVAL_MS, START_FETCH_DELAY_MS } from '../config/agentUsageConfig';
import type { AgentUsageSnapshot } from '../../../../../../../preload/types/agentUsage';
import type { UseAgentUsageTabReturn } from '../types/agentUsageTypes';

/** 跨挂载保留最近一次快照，重新展开时直接显示而不是骨架屏。 */
let cachedAgentUsageSnapshot: AgentUsageSnapshot | null = null;

/**
 * 读取本地日志用量快照，标签页可见期间每分钟刷新。
 * @returns 快照、失败与刷新状态及手动刷新回调
 */
export function useAgentUsageTab(): UseAgentUsageTabReturn {
  const [snapshot, setSnapshot] = useState<AgentUsageSnapshot | null>(() => cachedAgentUsageSnapshot);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (isCancelled: () => boolean = () => false): Promise<void> => {
    setLoading(true);
    try {
      const data = await window.api.agentUsageSnapshotGet();
      if (isCancelled()) return;
      cachedAgentUsageSnapshot = data;
      setSnapshot(data);
      setFailed(false);
    } catch {
      if (!isCancelled()) setFailed(true);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback((): void => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 读取异常已在 load 内处理。
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let intervalTimer: number | undefined;
    const isCancelled = (): boolean => cancelled;
    const poll = (): void => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 读取异常已在 load 内处理。
      void load(isCancelled);
    };
    const startPolling = (): void => {
      if (cancelled || intervalTimer !== undefined) return;
      poll();
      intervalTimer = window.setInterval(poll, REFRESH_INTERVAL_MS);
    };
    const stopPolling = (): void => {
      if (intervalTimer === undefined) return;
      window.clearInterval(intervalTimer);
      intervalTimer = undefined;
    };
    const handleVisibilityChange = (): void => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    // 延后首次扫描，避免与展开动画争抢主进程。
    const delayTimer = window.setTimeout(() => {
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, START_FETCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [load]);

  return { snapshot, failed, loading, handleRefresh };
}
