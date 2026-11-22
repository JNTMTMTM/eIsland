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
 */

/**
 * @file useCliStatus.ts
 * @description 按提供方订阅 Claude Code 或 Codex CLI 状态。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useIslandContentActive } from '../../../../../hooks/islandContentActivity';
import type { CliProvider } from '../../../../../../store/types';
import { EMPTY_CLI_STATUS, type CliStatusSnapshot } from '../types/types';

interface CliStatusActions {
  snapshot: CliStatusSnapshot;
  loading: boolean;
  actionMessage: string;
  actionFailed: boolean;
  mutating: boolean;
  setCodexHook: (enabled: boolean) => Promise<void>;
  enableMonitor: () => Promise<void>;
  disableMonitor: () => Promise<void>;
  clearEvents: () => Promise<void>;
  deleteSessions: (sessionIds: string[]) => Promise<void>;
}

const apiFor = (provider: CliProvider) => provider === 'codex'
  ? {
      get: window.api.codexStatusGet,
      enable: window.api.codexMonitorEnable,
      disable: window.api.codexMonitorDisable,
      clear: window.api.codexEventsClear,
      deleteSessions: window.api.codexSessionsDelete,
      subscribe: window.api.onCodexStatusUpdated,
    }
  : {
      get: window.api.claudeCodeStatusGet,
      enable: window.api.claudeCodeHookInstall,
      disable: window.api.claudeCodeHookUninstall,
      clear: window.api.claudeCodeEventsClear,
      deleteSessions: window.api.claudeCodeSessionsDelete,
      subscribe: window.api.onClaudeCodeStatusUpdated,
    };

/**
 * 订阅当前 CLI 提供方状态
 * @param provider - 当前活动提供方
 * @returns 统一快照和控制方法
 */
export function useCliStatus(provider: CliProvider): CliStatusActions {
  const active = useIslandContentActive();
  const [snapshot, setSnapshot] = useState<CliStatusSnapshot>(EMPTY_CLI_STATUS);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionFailed, setActionFailed] = useState(false);
  const [mutating, setMutating] = useState(false);
  const busyRef = useRef(false);
  const applySnapshot = useCallback((next: CliStatusSnapshot): void => {
    setSnapshot((current) => (next.revision ?? 0) < (current.revision ?? 0) ? current : next);
  }, []);
  const snapshotProviderRef = useRef(provider);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    requestGenerationRef.current += 1;
    busyRef.current = false;
    setMutating(false);
    setActionFailed(false);
    if (snapshotProviderRef.current !== provider) {
      snapshotProviderRef.current = provider;
      setSnapshot(EMPTY_CLI_STATUS);
      setActionMessage('');
      setLoading(true);
    }
    // 离场页面暂时保留 DOM，停止快照更新以免和外层尺寸动画争抢主线程。
    if (!active) return;

    const api = apiFor(provider);
    let cancelled = false;
    let receivedUpdate = false;
    api.get().then((next) => {
      if (cancelled || receivedUpdate) return;
      applySnapshot(next);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    const unsubscribe = api.subscribe((next) => {
      if (cancelled) return;
      receivedUpdate = true;
      applySnapshot(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      requestGenerationRef.current += 1;
      unsubscribe();
    };
  }, [provider, active, applySnapshot]);

  const runMutation = useCallback(async (
    mutate: () => Promise<CliStatusSnapshot | { ok: boolean; snapshot: CliStatusSnapshot; message: string }>,
  ): Promise<void> => {
    if (!active || busyRef.current) return;
    const generation = requestGenerationRef.current;
    busyRef.current = true;
    setMutating(true);
    setActionMessage('');
    setActionFailed(false);
    try {
      const result = await mutate();
      if (generation !== requestGenerationRef.current) return;
      if ('snapshot' in result) {
        applySnapshot(result.snapshot);
        setActionMessage(result.message);
        setActionFailed(!result.ok);
      } else {
        applySnapshot(result);
      }
    } catch (error) {
      if (generation === requestGenerationRef.current) {
        setActionFailed(true);
        setActionMessage(String(error));
      }
    } finally {
      if (generation === requestGenerationRef.current) {
        busyRef.current = false;
        setMutating(false);
      }
    }
  }, [active, applySnapshot]);

  // 回调逐层传给 EventStreamPanel，保持引用稳定避免子组件无谓更新。
  const enableMonitor = useCallback(() => runMutation(() => apiFor(provider).enable()), [runMutation, provider]);
  const disableMonitor = useCallback(() => runMutation(() => apiFor(provider).disable()), [runMutation, provider]);
  const clearEvents = useCallback(() => runMutation(() => apiFor(provider).clear()), [runMutation, provider]);
  const deleteSessions = useCallback(
    (ids: string[]) => runMutation(() => apiFor(provider).deleteSessions(ids)),
    [runMutation, provider],
  );
  const setCodexHook = useCallback(
    (enabled: boolean) => runMutation(() => window.api.codexHookSet(enabled)),
    [runMutation],
  );

  return {
    actionMessage,
    actionFailed,
    mutating,
    enableMonitor,
    disableMonitor,
    clearEvents,
    deleteSessions,
    setCodexHook,
    snapshot: snapshotProviderRef.current === provider ? snapshot : EMPTY_CLI_STATUS,
    loading: snapshotProviderRef.current !== provider || loading,
  };
}
