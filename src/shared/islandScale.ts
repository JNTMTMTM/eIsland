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
 * @file islandScale.ts
 * @description 灵动岛整体缩放的共享范围与数值校验。
 * @author 鸡哥
 */

export const ISLAND_SCALE_STORE_KEY = 'island-scale';
export const ISLAND_SCALE_MIN = 50;
export const ISLAND_SCALE_MAX = 150;
export const ISLAND_SCALE_DEFAULT = 100;

/**
 * 将持久化或输入的缩放值规范为整数百分比。
 * @param value - 原始缩放值，非有限数字回退到 100%。
 * @returns 50–150 之间的整数百分比。
 */
export function normalizeIslandScale(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(ISLAND_SCALE_MIN, Math.min(ISLAND_SCALE_MAX, Math.round(value)))
    : ISLAND_SCALE_DEFAULT;
}
