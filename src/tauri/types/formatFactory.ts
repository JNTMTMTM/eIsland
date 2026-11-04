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
 * @file formatFactory.ts
 * @description 格式工厂（视频/音频提取）相关类型定义
 * @author 鸡哥
 */

/** 视频提取选项 */
export interface ExtractVideoTrackOptions {
  filePath: string;
  trackType: string;
  outputFormat: string;
}

/** 视频提取结果 */
export interface ExtractVideoTrackResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  fileSize?: number;
}

/** 选择视频文件结果 */
export interface PickVideoForExtractResult {
  filePath: string;
  fileSize: number | null;
}
