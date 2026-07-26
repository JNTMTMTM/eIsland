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
 * @file timeTabTypes.ts
 * @description 时间 Tab 组件类型定义
 * @author 鸡哥
 */

/** TimeTab 组件入参 */
export interface TimeTabProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/** ActionButtons 组件 Props */
export interface ActionButtonsProps {
  /** 隐藏图标路径 */
  hideIcon?: string;
  /** 退出图标路径 */
  powerOffIcon?: string;
}

/** 截图模式 */
export type HoverScreenshotMode = 'region' | 'display';

/** Hover 时间区域面板模式 */
export type TimePanelMode = 'countdown' | 'brightness' | 'volume';

/** 计时器状态 */
export type TimerState = 'idle' | 'running' | 'paused';
