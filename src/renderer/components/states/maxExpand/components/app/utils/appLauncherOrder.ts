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
 * @file appLauncherOrder.ts
 * @description 应用导航与 MaxExpand Layout 共用排序，保留全部入口和传统导航可见性。
 * @author 鸡哥
 */

import { MAX_EXPAND_APP_TABS } from '../config/appLauncherConfig';
import { normalizeMaxExpandNavLayoutConfig } from '../../setting/utils/settingsConfig';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { MaxExpandNavLayoutConfig } from '../../setting/utils/settingsConfig';

/**
 * 根据布局顺序排列全部应用，布局未包含的设置入口放在末尾。
 * @param layout - 持久化导航布局，隐藏标记只作用于传统导航。
 * @returns 无重复且完整的应用入口顺序。
 */
export function getAppLauncherTabs(layout: MaxExpandNavLayoutConfig): MaxExpandTab[] {
  const ids = normalizeMaxExpandNavLayoutConfig(layout).map((item) => item.id);
  return [
    ...ids.filter((id): id is MaxExpandTab => MAX_EXPAND_APP_TABS.includes(id as MaxExpandTab)),
    ...MAX_EXPAND_APP_TABS.filter((tab) => !ids.includes(tab)),
  ];
}
/**
 * 移动应用到目标位置，仅修改顺序并保留原有可见性。
 * @param layout - 当前导航布局。
 * @param source - 被拖动应用。
 * @param target - 松手时的目标应用。
 * @returns 排序后的完整配置；固定入口或原地拖动返回原配置。
 */
export function reorderAppLauncherLayout(
  layout: MaxExpandNavLayoutConfig,
  source: MaxExpandTab,
  target: MaxExpandTab,
): MaxExpandNavLayoutConfig {
  if (source === target || source === 'settings' || target === 'settings') return layout;
  const updated = normalizeMaxExpandNavLayoutConfig(layout);
  const sourceIndex = updated.findIndex((item) => item.id === source);
  const targetIndex = updated.findIndex((item) => item.id === target);
  if (sourceIndex < 0 || targetIndex < 0) return layout;
  const [moved] = updated.splice(sourceIndex, 1);
  updated.splice(targetIndex, 0, moved);
  return updated;
}
