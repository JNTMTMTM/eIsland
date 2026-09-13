/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file useOverviewAlarmConfig.ts
 * @description 读取并同步 Overview 闹钟选择，供闹钟页面和小组件共用。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeOverviewAlarmIds, OVERVIEW_ALARM_STORE_KEY } from '../config/overviewAlarmConfig';

/** 订阅选择配置，保存后由设置事件同步其他窗口。 */
export function useOverviewAlarmConfig() {
  const [alarmIds, setAlarmIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const version = revision.current;
    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled || channel !== `store:${OVERVIEW_ALARM_STORE_KEY}`) return;
      revision.current++;
      setAlarmIds(normalizeOverviewAlarmIds(value));
      setLoaded(true);
    });
    window.api.storeRead(OVERVIEW_ALARM_STORE_KEY).then((value) => {
      if (cancelled || version !== revision.current) return;
      setAlarmIds(normalizeOverviewAlarmIds(value));
      setLoaded(true);
    }).catch(() => {});
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const updateAlarmIds = useCallback((ids: number[]): void => {
    const next = normalizeOverviewAlarmIds({ alarmIds: ids });
    revision.current++;
    setAlarmIds(next);
    window.api.storeWrite(OVERVIEW_ALARM_STORE_KEY, { alarmIds: next }).catch(() => {});
  }, []);

  return { alarmIds, loaded, updateAlarmIds };
}
