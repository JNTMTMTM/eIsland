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

import { useCallback, useEffect, useState } from 'react';
import type { CliProvider } from '../../../../../../store/types';
import { EMPTY_CLI_STATUS, type CliStatusSnapshot } from '../types/types';

interface CliStatusActions {
  snapshot: CliStatusSnapshot;
  loading: boolean;
  actionMessage: string;
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
  const [snapshot, setSnapshot] = useState<CliStatusSnapshot>(EMPTY_CLI_STATUS);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const api = apiFor(provider);
    let cancelled = false;
    setLoading(true);
    setSnapshot(EMPTY_CLI_STATUS);
    api.get().then((next) => {
      if (cancelled) return;
      setSnapshot(next);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    const unsubscribe = api.subscribe((next) => {
      setSnapshot(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [provider]);

  const enableMonitor = useCallback(async (): Promise<void> => {
    setActionMessage('');
    const result = await apiFor(provider).enable();
    setSnapshot(result.snapshot);
    setActionMessage(result.message);
  }, [provider]);

  const disableMonitor = useCallback(async (): Promise<void> => {
    setActionMessage('');
    const result = await apiFor(provider).disable();
    setSnapshot(result.snapshot);
    setActionMessage(result.message);
  }, [provider]);

  const clearEvents = useCallback(async (): Promise<void> => {
    setSnapshot(await apiFor(provider).clear());
  }, [provider]);

  const deleteSessions = useCallback(async (sessionIds: string[]): Promise<void> => {
    setSnapshot(await apiFor(provider).deleteSessions(sessionIds));
  }, [provider]);

  return { snapshot, loading, actionMessage, enableMonitor, disableMonitor, clearEvents, deleteSessions };
}