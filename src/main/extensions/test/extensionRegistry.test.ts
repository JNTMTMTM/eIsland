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
 * @file extensionRegistry.test.ts
 * @description 可选扩展目录契约、发布版本地址及返回值隔离。
 * @author 鸡哥
 */
import { describe, expect, it, vi } from 'vitest';
import { getExtensionRegistry } from '../extensionRegistry';

const mocks = vi.hoisted(() => ({
  version: '1.2.3'
}));

vi.mock('electron', () => ({
  app: {
    getVersion: () => mocks.version
  }
}));

describe('扩展注册目录', () => {
  it('每个发布扩展使用当前版本包名和对应安装目录', () => {
    const entries = getExtensionRegistry();
    expect(entries.map((entry) => entry.id)).toEqual(['volume-analyzer', 'volume-helper', 'brightness-helper']);
    entries.forEach((entry) => {
      expect(entry.zipName).toBe(`${entry.id}-v1.2.3.zip`);
      expect(entry.installDir).toBe(entry.id);
      expect(entry.requiredRestart).toBe(true);
      expect(entry.description).not.toBe('');
    });
  });

  it('版本变化即时生效，各次目录返回不共享可变条目', () => {
    const previous = getExtensionRegistry();
    previous[0].id = 'changed';
    mocks.version = '2.0.0';
    const current = getExtensionRegistry();
    expect(current[0].id).toBe('volume-analyzer');
    expect(current[0].zipName).toBe('volume-analyzer-v2.0.0.zip');
    mocks.version = '1.2.3';
  });
});
