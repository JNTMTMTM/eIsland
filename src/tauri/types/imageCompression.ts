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
 * @file imageCompression.ts
 * @description 图片压缩功能相关类型定义
 * @author 鸡哥
 */

/** 图片压缩任务 */
export interface ImageCompressionTask {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath: string;
  quality: number;
  status: 'completed' | 'failed';
  success: boolean;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/** 图片压缩启动载荷 */
export interface ImageCompressionStartPayload {
  inputPaths: string[];
  outputDir?: string;
  quality?: number;
}

/** 图片压缩启动结果 */
export interface ImageCompressionStartResult {
  ok: boolean;
  results?: ImageCompressionTask[];
  message?: string;
}
