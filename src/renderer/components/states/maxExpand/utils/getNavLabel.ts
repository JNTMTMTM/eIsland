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
 * @file getNavLabel.ts
 * @description 导航点标签映射工具函数
 * @author 鸡哥
 */

import type { NavDotId } from '../config/shellConstants';

/** 导航点 ID 到默认中文标签的映射 */
const NAV_LABEL_MAP: Record<string, string> = {
  expanded: '返回',
  todo: '待办',
  urlFavorites: 'URL 收藏',
  album: '相册',
  mail: '邮箱',
  localFileSearch: '文件查找',
  clipboardHistory: '剪贴板',
  aiChat: 'AI 对话',
  memo: '备忘录',
  countdown: '倒数日',
  alarm: '闹钟',
  toolbox: '工具箱',
  miniGame: '小游戏',
  stock: '股票行情',
  cli: 'CLI 控制台',
  calculator: '计算器',
  worldClock: '世界时钟',
  calendar: '日历',
  settings: '设置',
};

/**
 * 获取导航点的默认中文标签。
 * @param id - 导航点 ID。
 * @returns 中文标签文本。
 */
export function getDefaultNavLabel(id: NavDotId): string {
  return NAV_LABEL_MAP[id] ?? id;
}
