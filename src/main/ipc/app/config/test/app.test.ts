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
 * @file app.test.ts
 * @description 本地工具安全容量及设置广播映射契约测试。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { MAX_LOCAL_FILE_READ_BYTES, MAX_LOCAL_CMD_OUTPUT_BYTES, ISLAND_SETTINGS_REGISTRY, ISLAND_SETTING_BROADCAST_CHANNELS } from '../app';

describe('本地工具配置', () => {
  it('限制文件和命令输出各1MiB', () => {
    expect(MAX_LOCAL_FILE_READ_BYTES).toBe(1024 * 1024);
    expect(MAX_LOCAL_CMD_OUTPUT_BYTES).toBe(1024 * 1024);
  });

  it('注册表键唯一，广播映射均指向已注册设置', () => {
    const keys = ISLAND_SETTINGS_REGISTRY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    ISLAND_SETTINGS_REGISTRY.forEach((entry) => {
      expect(['string', 'number', 'boolean', 'array', 'object']).toContain(entry.type);
      expect(entry.description).not.toBe('');
    });
    expect(ISLAND_SETTING_BROADCAST_CHANNELS['theme-mode']).toBe('theme:mode');
    Object.entries(ISLAND_SETTING_BROADCAST_CHANNELS).forEach(([key, channel]) => {
      expect(keys).toContain(key);
      expect(channel).toMatch(/^(theme|island):/);
    });
  });
});
