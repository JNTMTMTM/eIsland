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

async function updateItems(update: (items: CountdownItem[]) => CountdownItem[]): Promise<boolean> {
  if (!useData.getState().loaded || useData.getState().saving) return false;
  useData.setState({ saving: true, error: false });
  try {
    // 修改前读取最新数据，避免独立窗口留存的旧快照覆盖另一窗口的更新。
    const latest = parseCountdownItems(await window.api.storeRead(STORE_KEY));
    const next = update(latest);
    if (!await window.api.storeWrite(STORE_KEY, next)) throw new Error('Countdown write failed');
    useData.setState({ items: next });
    return true;
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
        useData.setState({ items: parseCountdownItems(data), loaded: true });
      });
      window.api.storeRead(STORE_KEY).then((data) => {
        if (!cancelled && revision === 0) useData.setState({ items: parseCountdownItems(data), loaded: true });
      }).catch(() => {
        if (!cancelled) useData.setState({ error: true });
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
