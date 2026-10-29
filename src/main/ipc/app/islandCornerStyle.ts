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
 * @file islandCornerStyle.ts
 * @description 统一提交 UI 与 Agent 的边角设置，确保写入及广播按主进程调用顺序完成
 * @author 鸡哥
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { broadcastSettingChange } from '../../utils/broadcast';

/**
 * 同步提交边角设置，避免异步 Agent 写入在较新的 UI 写入后完成。
 * @param storeDir - 配置存储目录。
 * @param value - 待持久化的设置值。
 * @returns 写入及广播是否成功。
 */
export default function writeIslandCornerStyle(storeDir: string, value: unknown): boolean {
  try {
    mkdirSync(storeDir, { recursive: true });
    writeFileSync(join(storeDir, 'island-corner-style.json'), JSON.stringify(value, null, 2), 'utf-8');
    broadcastSettingChange(-1, 'store:island-corner-style', value);
    return true;
  } catch (error) {
    console.error('[IslandCornerStyle] save failed:', error);
    return false;
  }
}
