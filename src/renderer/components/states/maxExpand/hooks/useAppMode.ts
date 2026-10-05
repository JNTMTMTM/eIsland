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
 * @file useAppMode.ts
 * @description 读取应用化模式并同步当前窗口与其他设置窗口的切换。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import useIslandStore from '../../../../store/slices';
import { MAXEXPAND_APP_MODE_ENABLED_STORE_KEY, MAXEXPAND_APP_MODE_CHANGED_EVENT } from '../components/setting/utils/settingsConfig';

/**
 * 加载应用化模式，读取完成前暂停传统导航校正，避免覆盖快捷入口。
 * @returns 应用化模式开关及配置是否读取完成。
 */
export function useAppMode(): { appModeEnabled: boolean; appModeLoaded: boolean } {
  const appModeEnabled = useIslandStore((state) => state.maxExpandAppModeEnabled);
  const [appModeLoaded, setAppModeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let changed = false;
    const applyChange = (value: unknown): void => {
      if (cancelled) return;
      changed = true;
      const enabled = value === true;
      const store = useIslandStore.getState();
      if (enabled && !store.maxExpandAppModeEnabled) store.showMaxExpandLauncher();
      useIslandStore.setState({ maxExpandAppModeEnabled: enabled });
      setAppModeLoaded(true);
    };
    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel === `store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`) applyChange(value);
    });
    const handleLocalChange = (event: Event): void => {
      applyChange((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener(MAXEXPAND_APP_MODE_CHANGED_EVENT, handleLocalChange);

    const load = async (): Promise<void> => {
      try {
        const value = await window.api.storeRead(MAXEXPAND_APP_MODE_ENABLED_STORE_KEY);
        if (cancelled || changed) return;
        // 初次读取保留 setMaxExpandTab 指定的应用，只有用户开启开关时返回导航页。
        useIslandStore.setState({ maxExpandAppModeEnabled: value === true });
      } catch {
        // 读取失败时沿用当前窗口已知的模式，默认使用传统布局。
      } finally {
        if (!cancelled) setAppModeLoaded(true);
      }
    };
    void load();

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(MAXEXPAND_APP_MODE_CHANGED_EVENT, handleLocalChange);
    };
  }, []);

  return { appModeEnabled, appModeLoaded };
}
