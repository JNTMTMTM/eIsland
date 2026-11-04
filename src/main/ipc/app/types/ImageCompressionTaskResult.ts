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
 * @file ImageCompressionTaskResult.ts
 * @description 图片压缩任务结果类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

/** 图片压缩任务结果 */
export interface ImageCompressionTaskResult {
  /** 任务 ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 输入路径 */
  inputPath: string;
  /** 输出路径 */
  outputPath: string;
  /** 压缩质量 */
  quality: number;
  /** 任务状态 */
  status: 'completed' | 'failed';
  /** 是否成功 */
  success: boolean;
  /** 原始大小（字节） */
  originalBytes: number;
  /** 压缩后大小（字节） */
  compressedBytes: number;
  /** 压缩比 */
  ratio: number;
  /** 错误信息 */
  error?: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}
