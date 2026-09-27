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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file appTransitionTypes.ts
 * @description 应用导航缩放过渡的几何信息与 Hook 接口。
 * @author 鸡哥
 */

import type { RefObject } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';

/** 图标在动画舞台内的实际边界，包含悬停产生的缩放与避让位移。 */
export interface AppTransitionIcon {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 当前进入或返回过渡；不存在时各层使用静态样式。 */
export interface AppNavigationTransition {
  direction: 'open' | 'close';
  tab: MaxExpandTab;
  icon: AppTransitionIcon;
}

/** 应用导航的目标状态、动画条件及状态更新入口。 */
export interface UseAppNavigationTransitionOptions {
  activeTab: MaxExpandTab;
  launcherVisible: boolean;
  animationEnabled: boolean;
  contentActive: boolean;
  onSelectApp: (tab: MaxExpandTab) => void;
  onBackToLauncher: () => void;
}

/** 绑定舞台、导航层与应用层，并向导航按钮提供过渡操作。 */
export interface UseAppNavigationTransitionResult {
  stageRef: RefObject<HTMLDivElement | null>;
  launcherRef: RefObject<HTMLDivElement | null>;
  applicationRef: RefObject<HTMLDivElement | null>;
  transition: AppNavigationTransition | null;
  selectApp: (tab: MaxExpandTab) => void;
  backToLauncher: () => void;
}
