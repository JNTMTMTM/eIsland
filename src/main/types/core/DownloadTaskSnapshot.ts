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
 * @file DownloadTaskSnapshot.ts
 * @description 下载任务快照类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

/** 下载任务状态 */
export type DownloadTaskStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled';

/** 下载任务快照 */
export interface DownloadTaskSnapshot {
  /** 任务唯一标识 */
  id: string;
  /** 下载 URL */
  url: string;
  /** 保存路径 */
  savePath: string;
  /** 文件名 */
  fileName: string;
  /** 文件总字节数 */
  totalBytes: number;
  /** 已下载字节数 */
  downloadedBytes: number;
  /** 下载进度（0-1） */
  progress: number;
  /** 下载速度（字节/秒） */
  speedBytesPerSecond: number;
  /** 预计完成时间戳（毫秒），null 表示未知 */
  estimatedFinishAt: number | null;
  /** 下载线程数 */
  threads: number;
  /** 任务状态 */
  status: DownloadTaskStatus;
  /** 错误信息（仅失败状态） */
  errorMessage?: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 更新时间戳（毫秒） */
  updatedAt: number;
}
