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
 * @file useAppLauncherLayout.ts
 * @description 订阅并持久化应用导航与 MaxExpand Layout 共用的顺序。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavLayout } from '../../../hooks/useNavLayout';
import { MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../setting/utils/settingsConfig';
import { getAppLauncherTabs, reorderAppLauncherLayout } from '../utils/appLauncherOrder';
import type { MaxExpandTab } from '../../../../../../store/types';

/**
 * 当前窗口立即预览提交顺序，保存失败时恢复，其他窗口由主进程同步。
 * @returns 全部应用顺序、加载与保存状态、错误状态及移动入口。
 */
export default function useAppLauncherLayout(): {
  tabs: MaxExpandTab[];
  ready: boolean;
  saving: boolean;
  saveFailed: boolean;
  moveApp: (source: MaxExpandTab, target: MaxExpandTab) => Promise<void>;
} {
  const { navLayoutConfig, navLayoutLoaded } = useNavLayout();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const tabs = useMemo(() => getAppLauncherTabs(navLayoutConfig), [navLayoutConfig]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const moveApp = useCallback(async (source: MaxExpandTab, target: MaxExpandTab): Promise<void> => {
    if (!navLayoutLoaded || savingRef.current) return;
    const updated = reorderAppLauncherLayout(navLayoutConfig, source, target);
    if (updated === navLayoutConfig) return;
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: updated }));
    try {
      const saved = await window.api.storeWrite(MAXEXPAND_NAV_LAYOUT_STORE_KEY, updated);
      if (!saved) throw new Error('Layout save failed');
    } catch {
      window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: navLayoutConfig }));
      if (mountedRef.current) setSaveFailed(true);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }, [navLayoutConfig, navLayoutLoaded]);

  return { tabs, saving, saveFailed, moveApp, ready: navLayoutLoaded };
}
