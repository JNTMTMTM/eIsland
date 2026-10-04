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
 * @description 订阅应用导航与 MaxExpand Layout 共用的排序及可见性，持久化拖动排序和隐藏操作。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavLayout } from '../../../hooks/useNavLayout';
import { MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../setting/utils/settingsConfig';
import { getAppLauncherTabs, hideAppLauncherLayout, reorderAppLauncherLayout } from '../utils/appLauncherOrder';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { MaxExpandNavLayoutConfig } from '../../setting/utils/settingsConfig';

/**
 * 当前窗口立即预览排序或隐藏结果，保存失败时恢复，其他窗口由主进程同步。
 * @returns 可见应用顺序、加载与保存状态、错误状态及移动、隐藏入口。
 */
export default function useAppLauncherLayout(): {
  tabs: MaxExpandTab[];
  ready: boolean;
  saving: boolean;
  saveFailed: boolean;
  moveApp: (source: MaxExpandTab, target: MaxExpandTab) => Promise<void>;
  hideApp: (tab: MaxExpandTab) => Promise<void>;
} {
  const { navLayoutConfig, navLayoutLoaded } = useNavLayout();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  // 配置读取完成前不展示默认入口，避免已隐藏应用短暂出现并被打开。
  const tabs = useMemo(() => navLayoutLoaded ? getAppLauncherTabs(navLayoutConfig) : [], [navLayoutConfig, navLayoutLoaded]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const saveLayout = useCallback(async (updated: MaxExpandNavLayoutConfig): Promise<void> => {
    if (!navLayoutLoaded || savingRef.current) return;
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

  const moveApp = useCallback((source: MaxExpandTab, target: MaxExpandTab): Promise<void> => (
    saveLayout(reorderAppLauncherLayout(navLayoutConfig, source, target))
  ), [navLayoutConfig, saveLayout]);
  const hideApp = useCallback((tab: MaxExpandTab): Promise<void> => (
    saveLayout(hideAppLauncherLayout(navLayoutConfig, tab))
  ), [navLayoutConfig, saveLayout]);

  return { tabs, saving, saveFailed, moveApp, hideApp, ready: navLayoutLoaded };
}
