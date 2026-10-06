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
 * @file nativeRuntimeHarness.ts
 * @description CommonJS 插件真实入口的原生叶依赖加载隔离测试工具。
 * @author 鸡哥
 */

import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { vi } from 'vitest';
const nodeRequire = createRequire(import.meta.url);
const moduleLoader = Module as unknown as { _load: (request: string, parent: { filename?: string } | undefined, isMain?: boolean) => unknown };
/** CommonJS 真实入口及其可控叶依赖。 */
export interface NativeRuntimeFixture {
  read: <T>() => T;
  dispose: () => void;
}
/**
 * 对目标入口隔离原生依赖，始终执行目标文件本身。
 * @param file - 入口绝对路径
 * @param leaves - 被隔离的原生边界请求和返回值
 * @returns 实际加载与缓存清理操作
 */
export function createNativeRuntimeFixture(file: string, leaves: Map<string, unknown>): NativeRuntimeFixture {
  const original = moduleLoader._load;
  vi.spyOn(moduleLoader, '_load').mockImplementation((request, parent, isMain) => {
    if (parent?.filename && dirname(parent.filename) === dirname(file) && leaves.has(request)) {
      const boundary = leaves.get(request);
      if (boundary instanceof Error) throw boundary;
      return boundary;
    }
    return original(request, parent, isMain);
  });
  return {
    read: <T>() => {
      Object.keys(nodeRequire.cache).filter((key) => dirname(key) === dirname(file)).forEach((key) => {
        delete nodeRequire.cache[key];
      });
      return nodeRequire(file) as T;
    },
    dispose: () => {
      Object.keys(nodeRequire.cache).filter((key) => dirname(key) === dirname(file)).forEach((key) => {
        delete nodeRequire.cache[key];
      });
    }
  };
}
