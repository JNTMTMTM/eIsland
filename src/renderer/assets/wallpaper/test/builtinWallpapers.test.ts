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
 * @file builtinWallpapers.test.ts
 * @description builtinWallpapers 模块单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { BUILTIN_WALLPAPERS, resolveBuiltinWallpaper } from '../builtinWallpapers';

describe('BUILTIN_WALLPAPERS', () => {
  it('avoids tilde paths rejected by Vite on Windows', () => {
    BUILTIN_WALLPAPERS.forEach((wallpaper) => {
      expect(wallpaper.src).not.toContain('~');
    });
  });

  it('should be a non-empty array', () => {
    expect(Array.isArray(BUILTIN_WALLPAPERS)).toBe(true);
    expect(BUILTIN_WALLPAPERS.length).toBeGreaterThan(0);
  });

  it('each entry should have expected fields', () => {
    BUILTIN_WALLPAPERS.forEach((wallpaper) => {
      expect(wallpaper).toHaveProperty('id');
      expect(wallpaper).toHaveProperty('name');
      expect(wallpaper).toHaveProperty('src');
      expect(wallpaper).toHaveProperty('defaultOpacity');

      expect(typeof wallpaper.id).toBe('string');
      expect(wallpaper.id.length).toBeGreaterThan(0);
      expect(typeof wallpaper.name).toBe('string');
      expect(wallpaper.name.length).toBeGreaterThan(0);
      expect(typeof wallpaper.src).toBe('string');
      expect(wallpaper.src.length).toBeGreaterThan(0);
      expect(typeof wallpaper.defaultOpacity).toBe('number');
    });
  });
});

describe('resolveBuiltinWallpaper', () => {
  it('should find wallpaper by id', () => {
    BUILTIN_WALLPAPERS.forEach((expected) => {
      const result = resolveBuiltinWallpaper(expected.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(expected.id);
      expect(result!.name).toBe(expected.name);
      expect(result!.src).toBe(expected.src);
      expect(result!.defaultOpacity).toBe(expected.defaultOpacity);
    });
  });

  it('should return undefined for unknown id', () => {
    expect(resolveBuiltinWallpaper('nonexistent-id')).toBeUndefined();
  });

  it('should handle empty string', () => {
    expect(resolveBuiltinWallpaper('')).toBeUndefined();
  });
});
