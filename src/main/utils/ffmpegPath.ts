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
 * @file ffmpegPath.ts
 * @description 解析打包后 / 开发时的 ffmpeg 二进制路径
 *              打包后：extraResources/ffmpeg/ffmpeg.exe
 *              开发时：node_modules/ffmpeg-static/ffmpeg.exe
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { app } from 'electron';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * 获取 ffmpeg 可执行文件绝对路径
 * @returns ffmpeg.exe 路径，不存在时返回 null
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function getFfmpegPath(): string | null {
  // 打包后：process.resourcesPath 指向 resources/
  if (app.isPackaged) {
    const packed = resolve(join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe'));
    if (existsSync(packed)) return packed;
  }

  // 开发时：直接拼接 node_modules 路径（require 在 electron-vite 打包后不可用）
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require('ffmpeg-static') as string;
    if (staticPath && existsSync(staticPath)) return staticPath;
  } catch {
    // ffmpeg-static not installed
  }

  // 最终回退：系统 PATH
  return null;
}

/**
 * 获取 ffmpeg 二进制名称，供 spawn 使用
 * 如果有打包/本地路径则返回绝对路径，否则返回 'ffmpeg.exe' 依赖系统 PATH
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function getFfmpegBinary(): string {
  return getFfmpegPath() ?? (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
}
