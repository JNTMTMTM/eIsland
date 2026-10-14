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
 * @file islandScaleConfig.test.ts
 * @description 缩放比例边界、损坏配置回退与持久化失败测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeIslandScale } from '../../../shared/islandScale';
import { readIslandScaleConfig, writeIslandScaleConfig } from '../islandScaleConfig';

const io = vi.hoisted(() => ({ exists: vi.fn(), read: vi.fn(), write: vi.fn(), mkdir: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: () => 'profile' } }));
vi.mock('fs', () => ({ existsSync: io.exists, readFileSync: io.read, writeFileSync: io.write, mkdirSync: io.mkdir }));

beforeEach(() => { vi.resetAllMocks(); });

describe('灵动岛缩放配置', () => {
  it.each([
    [50, 50], [150, 150], [74.6, 75], [0, 50], [200, 150],
    [null, 100], ['75', 100], [NaN, 100], [Infinity, 100],
  ])('将 %s 规范为 %s%%', (value, expected) => {
    expect(normalizeIslandScale(value)).toBe(expected);
  });

  it('缺失或损坏的配置回退默认比例，正常配置在启动时恢复', () => {
    expect(readIslandScaleConfig()).toBe(100);
    io.exists.mockReturnValue(true); io.read.mockReturnValue('broken');
    expect(readIslandScaleConfig()).toBe(100);
    io.read.mockReturnValue('75');
    expect(readIslandScaleConfig()).toBe(75);
  });

  it('保存规范化后的比例，并将磁盘错误返回调用方', () => {
    expect(writeIslandScaleConfig(74.6)).toBe(true);
    expect(io.write).toHaveBeenLastCalledWith(expect.stringContaining('island-scale.json'), '75', 'utf-8');
    io.write.mockImplementation(() => { throw new Error('disk full'); });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(writeIslandScaleConfig(50)).toBe(false);
    error.mockRestore();
  });
});
