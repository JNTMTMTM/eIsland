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
 * @file useMigration.ts
 * @description 订阅 IPC 状态并管理界面动作，取消订阅与初始快照均遵循真实生命周期。
 * @author 鸡哥
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BUSY_PHASES } from '../config/migrationConfig';
import { stepForPhase } from '../utils/migrationUtils';
import type { UseMigrationReturn } from '../types/migrationTypes';
import type { AdapterState, SourceId } from '../../../../shared/types/adapterTypes';

/** 管理向导，renderer 只发送白名单动作。
 * @returns 页面状态与有限动作。
 */
export function useMigration(): UseMigrationReturn {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<AdapterState | null>(null);
  const [source, setSource] = useState<SourceId>('esa');
  const [error, setError] = useState<string | null>(null);
  const changeLanguage = useCallback((language: string) => {
    i18n.changeLanguage(language).catch(() => setError('operationFailed'));
    document.documentElement.lang = language;
  }, [i18n]);
  useEffect(() => {
    let active = true;
    let received = false;
    const off = window.migration.onState((value) => { if (active) { received = true; setState(value); setError(null); } });
    window.migration.getState().then((value) => { if (active && !received) setState(value); }).catch(() => { if (active) setError('operationFailed'); });
    return () => { active = false; off(); };
  }, []);
  const action = (work: () => Promise<unknown>): void => { work().catch(() => setError('operationFailed')); };
  const primary = (): void => {
    if (state?.phase === 'ready') action(() => window.migration.prepare());
    else if (state?.phase === 'prepared') action(() => window.migration.install());
    else if (state?.phase === 'complete' || state?.phase === 'installed') action(() => window.migration.launch());
    else action(() => window.migration.inspect(source));
  };
  return { state, t, source, primary, setSource, language: i18n.language, error: error || state?.error || null,
    busy: Boolean(state && BUSY_PHASES.includes(state.phase)), step: stepForPhase(state?.phase),
    setLanguage: changeLanguage,
    cancel: () => action(() => window.migration.cancel()), close: () => action(() => window.migration.close()),
    openBackup: () => action(() => window.migration.openBackup()) };
}
