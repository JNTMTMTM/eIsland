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
 * @file notificationTypes.ts
 * @description 通知组件类型定义
 * @author 鸡哥
 */

import type { CliProvider } from '../../../../store/types';

/** URL 收藏项 */
export interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  createdAt: number;
}

/** 更新源键 */
export type UpdateSourceKey = 'cloudflare-r2' | 'esa-cdn' | 'tencent-cos' | 'aliyun-oss' | 'github';

/** 更新下载进度数据 */
export interface DownloadProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

/** NotificationContent 组件属性 */
export interface NotificationContentProps {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body: string;
  /** 通知图标（可选） */
  icon?: string;
  /** 通知类型 */
  type?: 'default' | 'source-switch' | 'update-available' | 'update-downloading' | 'update-ready' | 'weather-alert-startup' | 'clipboard-url' | 'restart-required' | 'external-agent-active' | 'external-agent-stopped' | 'cli-session-detected';
  /** 检测到 CLI session 时应切换到的提供方 */
  cliProvider?: CliProvider;
  /** 外部 Agent 名称（仅 external-agent-active / external-agent-stopped 类型） */
  agentName?: string;
  /** 请求切换到的播放源 ID（仅 source-switch） */
  sourceAppId?: string;
  /** 更新版本号（用于 update-available / update-ready） */
  updateVersion?: string;
  /** 当前更新源展示文案（仅 update-available） */
  updateSourceLabel?: string;
  /** 天气预警发布时间文案（仅 weather-alert-startup） */
  weatherAlertTime?: string;
  /** 启动自动检查更新时要使用的更新源（仅 weather-alert-startup） */
  startupUpdateSource?: UpdateSourceKey;
  /** 启动自动检查更新时解析后的更新源地址（仅 weather-alert-startup） */
  startupUpdateResolvedUrl?: string;
  /** 检测到的 URL 列表（仅 clipboard-url） */
  urls?: string[];
  /** 休息提醒条目 ID（仅默认通知中由休息提醒触发时使用） */
  breakReminderItemId?: string;
}
