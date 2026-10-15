/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file islandScaleConfig.ts
 * @description 灵动岛整体缩放配置的读取与持久化。
 * @author 鸡哥
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { ISLAND_SCALE_DEFAULT, ISLAND_SCALE_STORE_KEY, normalizeIslandScale } from '../../shared/islandScale';

/**
 * 读取缩放配置，在窗口创建前恢复缩放。
 * @returns 缩放百分比，缺失或损坏时为 100%。
 */
export function readIslandScaleConfig(): number {
  try {
    const path = join(app.getPath('userData'), 'eIsland_store', `${ISLAND_SCALE_STORE_KEY}.json`);
    return existsSync(path) ? normalizeIslandScale(JSON.parse(readFileSync(path, 'utf-8'))) : ISLAND_SCALE_DEFAULT;
  } catch {
    return ISLAND_SCALE_DEFAULT;
  }
}

/**
 * 保存缩放配置。
 * @param scale - 缩放百分比。
 * @returns 是否成功写入。
 */
export function writeIslandScaleConfig(scale: number): boolean {
  let temporaryPath: string | undefined;
  try {
    const directory = join(app.getPath('userData'), 'eIsland_store');
    mkdirSync(directory, { recursive: true });
    const path = join(directory, `${ISLAND_SCALE_STORE_KEY}.json`);
    temporaryPath = `${path}.tmp`;
    // 同目录 rename 原子替换，写入失败或中断不会截断上次保存的配置。
    writeFileSync(temporaryPath, JSON.stringify(normalizeIslandScale(scale)), { encoding: 'utf-8', flush: true });
    renameSync(temporaryPath, path);
    return true;
  } catch (error) {
    console.error('[IslandScale] persist error:', error);
    return false;
  } finally {
    if (temporaryPath) {
      try { rmSync(temporaryPath, { force: true }); } catch { /* 清理失败不影响已保存的配置。 */ }
    }
  }
}
