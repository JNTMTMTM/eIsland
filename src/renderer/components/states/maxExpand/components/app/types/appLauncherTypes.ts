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
 * @file appLauncherTypes.ts
 * @description MaxExpand 应用导航模块的类型定义。
 * @author 鸡哥
 */

import type { MaxExpandTab } from '../../../../../../store/types';

/** MaxExpandAppLauncher 组件入参 */
export interface MaxExpandAppLauncherProps {
  /** 打开指定 MaxExpand 应用的回调 */
  onSelectApp: (tab: MaxExpandTab) => void;
}

/** 单个应用图标的悬停避让位移（像素） */
export interface AppLauncherHoverOffset {
  /** 水平位移 */
  x: number;
  /** 垂直位移 */
  y: number;
}
