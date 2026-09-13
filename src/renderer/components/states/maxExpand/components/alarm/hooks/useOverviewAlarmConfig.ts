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

  const updateAlarmIds = useCallback(async (ids: number[]): Promise<boolean> => {
    const prev = alarmIds;
    const next = normalizeOverviewAlarmIds({ alarmIds: ids });
    revision.current++;
    setAlarmIds(next);
    try {
      const ok = await window.api.storeWrite(OVERVIEW_ALARM_STORE_KEY, { alarmIds: next });
      if (!ok) { revision.current++; setAlarmIds(prev); }
      return ok;
    } catch {
      revision.current++;
      setAlarmIds(prev);
      return false;
    }
  }, [alarmIds]);

  return { alarmIds, loaded, updateAlarmIds };
}
