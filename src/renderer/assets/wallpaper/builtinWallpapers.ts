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
 */

/**
 * @file builtinWallpapers.ts
 * @description 内置壁纸注册表，定义预设壁纸的元数据（名称、路径、默认透明度）
 * @author 鸡哥
 */

import wallpaperArt002 from './art002e008487~orig.jpg';
import wallpaperArt004 from './art002e004441~orig.jpg';
import wallpaperArt006 from './art002e008486~orig.jpg';

export interface BuiltinWallpaper {
  id: string;
  name: string;
  src: string;
  defaultOpacity: number;
}

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  { id: 'art002', name: 'Spaceship Earth', src: wallpaperArt002, defaultOpacity: 16 },
  { id: 'art004', name: 'A Crescent Earth', src: wallpaperArt004, defaultOpacity: 45 },
  { id: 'art006', name: 'Thinking of You, Earth', src: wallpaperArt006, defaultOpacity: 20 },
];

/**
 * 根据 ID 查找内置壁纸配置
 * @param id - 壁纸唯一标识
 * @returns 匹配的壁纸配置，未找到时返回 undefined
 */
export function resolveBuiltinWallpaper(id: string): BuiltinWallpaper | undefined {
  return BUILTIN_WALLPAPERS.find((w) => w.id === id);
}
