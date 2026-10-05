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
 * 当前窗口立即预览排序或隐藏结果，依次保存连续操作，失败时恢复最近已保存布局。
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
  const [previewLayout, setPreviewLayout] = useState<MaxExpandNavLayoutConfig | null>(null);
  const latestLayoutRef = useRef(navLayoutConfig);
  const savedLayoutRef = useRef(navLayoutConfig);
  const pendingSaveRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const currentLayout = previewLayout ?? navLayoutConfig;
  // 配置读取完成前不展示默认入口，避免已隐藏应用短暂出现并被打开。
  const tabs = useMemo(() => navLayoutLoaded ? getAppLauncherTabs(currentLayout) : [], [currentLayout, navLayoutLoaded]);

  useEffect(() => {
    if (pendingSaveRef.current) return;
    latestLayoutRef.current = navLayoutConfig;
    savedLayoutRef.current = navLayoutConfig;
  }, [navLayoutConfig]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const saveLayout = useCallback((updated: MaxExpandNavLayoutConfig): Promise<void> => {
    if (!navLayoutLoaded || updated === latestLayoutRef.current) return Promise.resolve();
    latestLayoutRef.current = updated;
    setPreviewLayout(updated);
    setSaving(true);
    setSaveFailed(false);
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: updated }));
    const previous = pendingSaveRef.current ?? Promise.resolve();
    const save = async (): Promise<void> => {
      await previous;
      let failed = false;
      try {
        const saved = await window.api.storeWrite(MAXEXPAND_NAV_LAYOUT_STORE_KEY, updated);
        if (!saved) throw new Error('Layout save failed');
        savedLayoutRef.current = updated;
      } catch {
        failed = true;
      } finally {
        // 后续快照已包含先前操作，不能让较早保存的失败回滚最新预览。
        if (latestLayoutRef.current === updated) {
          if (failed) {
            latestLayoutRef.current = savedLayoutRef.current;
            if (mountedRef.current) setSaveFailed(true);
          }
          pendingSaveRef.current = null;
          window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: latestLayoutRef.current }));
          if (mountedRef.current) {
            setPreviewLayout(null);
            setSaving(false);
          }
        }
      }
    };
    const pending = save();
    pendingSaveRef.current = pending;
    return pending;
  }, [navLayoutLoaded]);

  const moveApp = useCallback((source: MaxExpandTab, target: MaxExpandTab): Promise<void> => (
    saveLayout(reorderAppLauncherLayout(latestLayoutRef.current, source, target))
  ), [saveLayout]);
  const hideApp = useCallback((tab: MaxExpandTab): Promise<void> => (
    saveLayout(hideAppLauncherLayout(latestLayoutRef.current, tab))
  ), [saveLayout]);

  return { tabs, saving, saveFailed, moveApp, hideApp, ready: navLayoutLoaded };
}
