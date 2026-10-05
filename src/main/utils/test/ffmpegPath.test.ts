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
 * @file ffmpegPath.test.ts
 * @description FFmpeg打包路径优先级、静态依赖缺失及平台命令回退测试。
 * @author 鸡哥
 */
import { Module } from 'node:module';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFfmpegBinary, getFfmpegPath } from '../ffmpegPath';
import type { Mock } from 'vitest';

interface FfmpegMocks {
  packaged: boolean;
  exists: Mock<(path: string) => boolean>;
  staticPath: string | null;
  missing: boolean;
  loads: Mock<() => void>;
}

const mocks = vi.hoisted<FfmpegMocks>(() => ({
  packaged: false,
  exists: vi.fn<(path: string) => boolean>(),
  staticPath: 'C:/static/ffmpeg.exe',
  missing: false,
  loads: vi.fn()
}));

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.packaged;
    }
  }
}));

vi.mock('fs', () => ({
  existsSync: mocks.exists
}));

const loader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain?: boolean) => unknown;
};

const resources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');

const platform = Object.getOwnPropertyDescriptor(process, 'platform');

beforeEach(() => {
  mocks.packaged = false;
  mocks.staticPath = 'C:/static/ffmpeg.exe';
  mocks.missing = false;
  mocks.exists.mockReset();
  mocks.exists.mockReturnValue(false);
  mocks.loads.mockClear();
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value: 'C:/resources'
  });
  const original = loader._load;
  vi.spyOn(loader, '_load').mockImplementation((request, parent, isMain) => {
    if (request !== 'ffmpeg-static') {
      return original(request, parent, isMain);
    }
    mocks.loads();
    if (mocks.missing) {
      throw new Error('not installed');
    }
    return mocks.staticPath;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (resources) {
    Object.defineProperty(process, 'resourcesPath', resources);
  } else {
    Reflect.deleteProperty(process, 'resourcesPath');
  }
  if (platform) {
    Object.defineProperty(process, 'platform', platform);
  }
});

describe('FFmpeg binary resolution', () => {
  it('打包后优先resources中的exe，不加载静态依赖', () => {
    mocks.packaged = true;
    const packed = resolve(join('C:/resources', 'ffmpeg', 'ffmpeg.exe'));
    mocks.exists.mockImplementation((path) => path === packed);
    expect(getFfmpegPath()).toBe(packed);
    expect(mocks.loads).not.toHaveBeenCalled();
  });

  it.each([true, false])('打包=%s时找不到资源仍尝试静态依赖', (packaged) => {
    mocks.packaged = packaged;
    mocks.exists.mockImplementation((path) => path === mocks.staticPath);
    expect(getFfmpegPath()).toBe('C:/static/ffmpeg.exe');
    expect(mocks.loads).toHaveBeenCalledOnce();
  });

  it.each(['missing', 'empty', 'absent'] as const)('静态依赖%s时安全返回null', (mode) => {
    mocks.missing = mode === 'missing';
    if (mode === 'empty') {
      mocks.staticPath = null;
    }
    expect(getFfmpegPath()).toBeNull();
  });

  it.each([['win32', 'ffmpeg.exe'], ['linux', 'ffmpeg'], ['darwin', 'ffmpeg']])('平台%s回退命令%s', (name, expected) => {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: name
    });
    expect(getFfmpegBinary()).toBe(expected);
  });

  it('找到静态依赖后返回完整路径而不是系统命令', () => {
    mocks.exists.mockReturnValue(true);
    expect(getFfmpegBinary()).toBe('C:/static/ffmpeg.exe');
  });
});
