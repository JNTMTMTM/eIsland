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
 * @file ffiLoaderHarness.ts
 * @description FFI 加载测试夹具；实际加载 CommonJS 目标，只替换文件访问和 koffi 原生边界。
 * @author 鸡哥
 */

import { createRequire, Module } from 'node:module';
import { vi } from 'vitest';
import type { Mock } from 'vitest';

const nodeRequire = createRequire(import.meta.url);
const loader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain?: boolean) => unknown;
};

/** FFI 边界的可控依赖及真实目标加载方法。 */
export interface FfiFixture {
  access: Mock<(candidate: string) => void>;
  load: Mock<(dllPath: string) => { func: Mock<(signature: string, ...args: unknown[]) => Mock<(...args: unknown[]) => unknown>> }>;
  disposable: Mock<(type: string, free: unknown) => { owned: true }>;
  func: Mock<(signature: string, ...args: unknown[]) => Mock<(...args: unknown[]) => unknown>>;
  native: (name: string) => Mock<(...args: unknown[]) => unknown>;
  read: <T>() => T;
}

/**
 * 隔离原生 DLL 依赖后加载真实 ffi-loader，而不是复制其实现。
 * @param file - ffi-loader.js 的绝对路径。
 * @returns 文件访问、DLL 注册及原生函数的可断言夹具。
 */
export function createFfiFixture(file: string): FfiFixture {
  const access = vi.fn<(candidate: string) => void>();
  const functions = new Map<string, Mock<(...args: unknown[]) => unknown>>();
  const func = vi.fn<(signature: string, ...args: unknown[]) => Mock<(...args: unknown[]) => unknown>>((signature) => {
    const name = signature.match(/(\w+)\s*\(/)?.[1] ?? signature;
    const callable = vi.fn<(...args: unknown[]) => unknown>();
    functions.set(name, callable);
    return callable;
  });
  const load = vi.fn<(dllPath: string) => { func: typeof func }>(() => ({ func }));
  const disposable = vi.fn<(type: string, free: unknown) => { owned: true }>(() => ({ owned: true }));
  const original = loader._load;
  vi.spyOn(loader, '_load').mockImplementation((request, parent, isMain) => {
    if (request === 'node:fs') return { accessSync: access };
    if (request === 'koffi') return { load, disposable };
    return original(request, parent, isMain);
  });
  return {
    access,
    load,
    disposable,
    func,
    native: (name) => {
      const callable = functions.get(name);
      if (!callable) throw new Error(`未注册的原生函数: ${  name}`);
      return callable;
    },
    read: <T>() => {
      // 每个场景重新执行目标初始化，覆盖候选 DLL 的失败与回退。
      delete nodeRequire.cache[nodeRequire.resolve(file)];
      const exports: unknown = nodeRequire(file);
      return exports as T;
    },
  };
}
