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
 * @file packaged-path.test.ts
 * @description 验证音量 helper 在 Electron 打包资源目录中的路径解析。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { win32 as path } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

interface VolumeModule {
  getVolume: () => number | null;
}

describe('packaged volume helper path', () => {
  it('prefers the executable copied to process.resourcesPath', () => {
    const resourcesPath = 'C:\\Program Files\\eIsland\\resources';
    const expectedHelperPath = path.join(
      resourcesPath,
      'helpers',
      'volume',
      'eIslandVolumeHelper.exe',
    );
    const spawnSync = vi.fn(() => ({
      status: 0,
      error: undefined,
      stdout: JSON.stringify({ level: 50 }),
    }));
    const module = { exports: {} as VolumeModule };

    vm.runInNewContext(
      readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8'),
      {
        module,
        exports: module.exports,
        __dirname: 'C:\\Program Files\\eIsland\\resources\\app.asar\\node_modules\\@eisland\\windows-volume-helper',
        process: { platform: 'win32', resourcesPath },
        require: (id: string) => {
          if (id === 'node:child_process') return { spawnSync, spawn: vi.fn() };
          if (id === 'node:fs') return { existsSync: (candidate: string) => candidate === expectedHelperPath };
          if (id === 'node:path') return path;
          if (id === 'node:events') return { EventEmitter };
          throw new Error(`Unexpected dependency: ${id}`);
        },
      },
    );

    expect(module.exports.getVolume()).toBe(50);
    expect(spawnSync).toHaveBeenCalledWith(
      expectedHelperPath,
      ['get'],
      expect.objectContaining({ windowsHide: true }),
    );
  });

  it('falls back to legacy helper path when packaged helper is unavailable', () => {
    const asarDir = 'C:\\Program Files\\eIsland\\resources\\app.asar\\node_modules\\@eisland\\windows-volume-helper';
    const legacyHelperPath = path.join(asarDir, 'src', 'bin', 'Release', 'net10.0', 'eIslandVolumeHelper.exe');
    const spawnSync = vi.fn(() => ({
      status: 0,
      error: undefined,
      stdout: JSON.stringify({ level: 75 }),
    }));
    const module = { exports: {} as VolumeModule };

    vm.runInNewContext(
      readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8'),
      {
        module,
        exports: module.exports,
        __dirname: asarDir,
        process: { platform: 'win32' },
        require: (id: string) => {
          if (id === 'node:child_process') return { spawnSync, spawn: vi.fn() };
          if (id === 'node:fs') return { existsSync: (candidate: string) => candidate === legacyHelperPath };
          if (id === 'node:path') return path;
          if (id === 'node:events') return { EventEmitter };
          throw new Error(`Unexpected dependency: ${id}`);
        },
      },
    );

    expect(module.exports.getVolume()).toBe(75);
    expect(spawnSync).toHaveBeenCalledWith(
      legacyHelperPath,
      ['get'],
      expect.objectContaining({ windowsHide: true }),
    );
  });
});