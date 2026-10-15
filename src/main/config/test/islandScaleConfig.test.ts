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

import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeIslandScale } from '../../../shared/islandScale';
import { readIslandScaleConfig, writeIslandScaleConfig } from '../islandScaleConfig';

const io = vi.hoisted(() => ({ exists: vi.fn(), read: vi.fn(), write: vi.fn(), mkdir: vi.fn(), rename: vi.fn(), rm: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: () => 'profile' } }));
vi.mock('fs', () => ({ existsSync: io.exists, readFileSync: io.read, writeFileSync: io.write, mkdirSync: io.mkdir, renameSync: io.rename, rmSync: io.rm }));

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
    expect(io.write).toHaveBeenLastCalledWith(expect.stringContaining('island-scale.json.tmp'), '75', { encoding: 'utf-8', flush: true });
    expect(io.rename).toHaveBeenLastCalledWith(expect.stringContaining('island-scale.json.tmp'), expect.stringMatching(/island-scale\.json$/));
    expect(io.write.mock.invocationCallOrder[0]).toBeLessThan(io.rename.mock.invocationCallOrder[0]);
    io.write.mockImplementation(() => { throw new Error('disk full'); });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(writeIslandScaleConfig(50)).toBe(false);
    error.mockRestore();
  });

  it.each(['write', 'rename'] as const)('%s 失败时保留旧配置并清理临时文件', (failure) => {
    const savedPath = join('profile', 'eIsland_store', 'island-scale.json');
    const files = new Map<string, string>([[savedPath, '75']]);
    io.exists.mockReturnValue(true);
    io.read.mockImplementation((path: string) => files.get(path));
    io.write.mockImplementation((path: string, value: string) => {
      files.set(path, '');
      if (failure === 'write') throw new Error('partial write');
      files.set(path, value);
    });
    io.rename.mockImplementation(() => { throw new Error('replace failed'); });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(writeIslandScaleConfig(50)).toBe(false);
    expect(readIslandScaleConfig()).toBe(75);
    if (failure === 'write') expect(io.rename).not.toHaveBeenCalled();
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('.json.tmp'), { force: true });
    error.mockRestore();
  });
});
