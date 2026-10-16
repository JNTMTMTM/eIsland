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
 * @file types/index.ts
 * @description 托盘菜单模块类型定义
 * @author 鸡哥
 */

import type { TrayMenuAction } from '../../../../../shared/trayMenu';

/** 托盘顶部用户卡片展示的账号摘要 */
export interface TrayUserSummary {
  /** 是否已登录（本地同时存在 token 与资料缓存） */
  loggedIn: boolean;
  /** 展示名称，使用账号 username */
  name: string;
  /** 头像地址，无头像时为 null */
  avatar: string | null;
  /** 邮箱，未登录时为空字符串 */
  email: string;
  /** 是否为 Pro 用户 */
  isPro: boolean;
  /** Pro 到期日期（YYYY-MM-DD），无到期信息时为 null */
  proExpireDate: string | null;
}

/** 托盘音乐卡片展示的当前播放信息 */
export interface TrayNowPlaying {
  /** 歌曲标题 */
  title: string;
  /** 歌手，未知时为空字符串 */
  artist: string;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 封面 data URI，未获取到时为 null */
  thumbnail: string | null;
}

/** 托盘菜单项配置 */
export type TrayMenuItemConfig =
  | {
    kind: 'action' | 'toggle';
    action: TrayMenuAction;
    /** 文案 i18n key */
    labelKey: string;
    /** 主窗口不存在时禁用 */
    requiresWindow?: boolean;
    /** 仅独立窗口模式下显示 */
    standaloneOnly?: boolean;
    /** 危险操作（如退出）使用警示色 */
    danger?: boolean;
  }
  | {
    kind: 'separator';
    /** 分隔线在列表中的稳定 key */
    id: string;
  };
