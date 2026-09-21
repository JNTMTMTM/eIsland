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
 * @file useCountdownItems.ts
 * @description 共享倒数日存储：仅用户修改时写入，同步所有展示面并报告保存错误。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { STORE_KEY } from '../config/countdownConfig';
import { parseCountdownItems } from '../utils/countdownUtils';
import type { CountdownItem } from '../types/countdownTypes';

interface CountdownState {
  items: CountdownItem[];
  loaded: boolean;
  saving: boolean;
  error: boolean;
}
const useData = create<CountdownState>(() => ({ items: [], loaded: false, saving: false, error: false }));
let subscribers = 0;
let stopSync: (() => void) | undefined;
let syncRevision = 0;

async function updateItems(update: (items: CountdownItem[]) => CountdownItem[]): Promise<boolean> {
  if (!useData.getState().loaded || useData.getState().saving) return false;
  useData.setState({ saving: true, error: false });
  try {
    // 主进程原子比较快照，冲突后基于最新数据重新应用修改。
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const latest = await window.api.storeRead(STORE_KEY, true);
      const next = update(parseCountdownItems(latest));
      const revision = syncRevision;
      const result = await window.api.storeCompareAndSwap(STORE_KEY, latest, next);
      if (result === 'conflict') continue;
      if (result !== 'updated') throw new Error('Countdown write failed');
      // 保存应答可能晚于其他窗口的新提交，不能覆盖已收到的更新。
      if (revision === syncRevision) useData.setState({ items: next });
      return true;
    }
    throw new Error('Countdown update conflicts exceeded retry limit');
  } catch {
    useData.setState({ error: true });
    return false;
  } finally {
    useData.setState({ saving: false });
  }
}

/**
 * 订阅主页面与 expand 小组件共享的数据。
 * @returns 条目、保存状态和持久化操作
 */
export function useCountdownItems() {
  const state = useData();
  useEffect(() => {
    subscribers += 1;
    if (subscribers === 1) {
      let cancelled = false;
      let revision = 0;
      const unsubscribe = window.api.onSettingsChanged((channel, data) => {
        if (channel !== `store:${STORE_KEY}`) return;
        revision += 1;
        syncRevision += 1;
        useData.setState({ items: parseCountdownItems(data), loaded: true, error: false });
      });
      window.api.storeRead(STORE_KEY, true).then((data) => {
        if (!cancelled && revision === 0) useData.setState({ items: parseCountdownItems(data), loaded: true, error: false });
      }).catch(() => {
        if (!cancelled && revision === 0) useData.setState({ error: true, loaded: true });
      });
      stopSync = () => { cancelled = true; unsubscribe(); };
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stopSync?.();
    };
  }, []);
  return { ...state, updateItems };
}
