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
 * @file extension.ts
 * @description 可选扩展相关类型定义
 * @author 鸡哥
 */

/** 扩展安装状态 */
export interface ExtensionStatus {
  /** 扩展 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 可用版本（CDN 上的版本） */
  availableVersion: string;
  /** 已安装版本（null 表示未安装） */
  installedVersion: string | null;
  /** 是否已安装 */
  isInstalled: boolean;
  /** 安装后是否需要重启 */
  requiredRestart: boolean;
}

/** 扩展安装进度 */
export interface ExtensionProgressData {
  /** 扩展 ID */
  id: string;
  /** 进度百分比 0-100 */
  progress: number;
  /** 已下载字节数 */
  transferred: number;
  /** 总字节数 */
  total: number;
}
